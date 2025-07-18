import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { UserService } from '../user/user.service';

export interface RankingEntry {
  rank: number;
  teamName: string;
  points: number;
  problems: string[];
}

export interface ProblemEntry {
  number: number;
  name: string;
  href: string;
}

export interface SubmissionEntry {
  id: string;
  status: string;
  problemName: string;
  problemNumber: string;
  user: string;
}

@Injectable()
export class ScrapingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}
  async scrapeVNOIRanking(): Promise<RankingEntry[]> {
    try {
      const contestUrl = this.configService.get<string>('VNOI_CONTEST_URL') || 'https://oj.vnoi.info/contest/vnoicup25_r2';
      const url = `${contestUrl}/ranking/`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const rankings: RankingEntry[] = [];

      // Try different selectors for the ranking table
      const tableSelectors = [
        'table tbody tr',
        '.ranking-table tbody tr',
        '.contest-ranking tbody tr',
        'table.ranking tbody tr',
        '.table tbody tr',
      ];

      let foundRows = false;

      for (const selector of tableSelectors) {
        const rows = $(selector);

        if (rows.length > 0) {
          foundRows = true;
          rows.each((index, element) => {
            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 3) {
              const rankText = $row.find('td').first().text().trim();
              const teamNameText = $row.find('td').eq(1).find('a').first().text().trim();
              // remove the div inside
              const pointsText = $row.find('td').eq(2).find('a').html()?.trim().split('<div')[0] ?? '0';

              const rank = Number.parseInt(rankText) || index + 1;
              const scrapedTeamName = teamNameText || `Team ${index + 1}`;
              const points = Number.parseFloat(pointsText) || 0;

              // Extract problem statuses (assuming they're in subsequent columns)
              const problems: string[] = [];
              for (let i = 3; i < cells.length; i++) {
                const problemStatus = $(cells[i]).text().trim();
                if (problemStatus) {
                  problems.push(problemStatus);
                }
              }

              rankings.push({
                rank,
                teamName: scrapedTeamName,
                points,
                problems,
              });
            }
          });
          break;
        }
      }

      if (rankings.length === 0) {
        return [];
      }

      // Remove the last entry from rankings if it exists
      if (rankings.length > 0) {
        rankings.pop();
      }

      console.log(`Successfully scraped ${rankings.length} ranking entries`);

      // Resolve team names to full names if they match usernames
      const resolvedRankings = await Promise.all(
        rankings.map(async (ranking) => ({
          ...ranking,
          teamName: await this.resolveUsername(ranking.teamName),
        }))
      );

      return resolvedRankings;
    } catch (error: any) {
      console.error('Error scraping VNOI ranking:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      return [];
    }
  }

  private async scrapeVNOIProblems(): Promise<ProblemEntry[]> {
    try {
      const contestUrl = this.configService.get<string>('VNOI_CONTEST_URL') || 'https://oj.vnoi.info/contest/vnoicup25_r2';
      const url = contestUrl;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const problems: ProblemEntry[] = [];

      // Try different selectors for the problem table
      const tableSelectors = [
        'table tbody tr',
        '.problem-table tbody tr',
        '.contest-problems tbody tr',
        'table.problems tbody tr',
        '.table tbody tr',
      ];

      for (const selector of tableSelectors) {
        const rows = $(selector);

        if (rows.length > 0) {
          rows.each((index, element) => {
            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 2) {
              // Try to extract problem number from first column
              const numberText = $(cells[0]).text().trim();
              const number = Number.parseInt(numberText) || index + 1;

              // Try to extract problem name and href from second column
              const nameElement = $(cells[1]).find('a').first();
              const name = nameElement.text().trim() || `Problem ${number}`;
              const href = nameElement.attr('href') || '';

              problems.push({
                number,
                name,
                href,
              });
            }
          });
          break;
        }
      }

      console.log(`Successfully scraped ${problems.length} problem entries`);
      return problems;
    } catch (error: any) {
      console.error('Error scraping VNOI problems:', error.message);
      return [];
    }
  }

  private numberToLetter(number: number): string {
    if (number <= 0) return 'A';
    return String.fromCharCode(64 + number); // 65 is 'A' in ASCII
  }

  private async resolveUsername(username: string): Promise<string> {
    try {
      const user = await this.userService.getUser(username);
      return user.fullName || username;
    } catch (error) {
      // If user not found in database, return the original username
      return username;
    }
  }

  async scrapeVNOISubmissions(): Promise<SubmissionEntry[]> {
    try {
      // First, scrape the problems to get the mapping
      const problems = await this.scrapeVNOIProblems();
      const problemMap = new Map<string, string>();

      // Create mapping from problem name/href to letter
      problems.forEach(problem => {
        const letter = this.numberToLetter(problem.number);
        problemMap.set(problem.name.toLowerCase(), letter);
        problemMap.set(problem.href.toLowerCase(), letter);
        // Also map by problem number
        problemMap.set(problem.number.toString(), letter);
      });

      const contestUrl = this.configService.get<string>('VNOI_CONTEST_URL') || 'https://oj.vnoi.info/contest/vnoicup25_r2';
      const url = `${contestUrl}/submissions/`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const submissions: SubmissionEntry[] = [];

      // Find all submission rows
      const submissionRows = $('.submission-row');

      if (submissionRows.length > 0) {
        submissionRows.each((index, element) => {
          const $row = $(element);

          // Get submission ID from the id attribute
          const id = $row.attr('id') || `submission-${index}`;

          // Get submission result status from sub-result div
          const statusElement = $row.find('.sub-result');
          let status = 'Unknown';
          if (statusElement.length > 0) {
            // Get the class name that represents the status (AC, WA, TLE, etc.)
            const classNames = statusElement.attr('class')?.split(' ') || [];
            const statusClass = classNames.find(cls => cls !== 'sub-result' && cls !== '');
            status = statusClass || 'Unknown';
          }

          // Get problem name and try to map to letter
          const problemNameElement = $row.find('.sub-info').find('.name').find('a');
          const problemName = problemNameElement.text().trim() || `Problem ${index + 1}`;
          const problemHref = problemNameElement.attr('href') || '';

          // Try to map problem to letter
          let problemNumber = 'A';
          const mappedLetter = problemMap.get(problemName.toLowerCase()) ||
                              problemMap.get(problemHref.toLowerCase()) ||
                              this.numberToLetter(index + 1);
          problemNumber = mappedLetter;

          // Get user name
          const scrapedUsername = $row.find('.user').text().trim() || `User ${index + 1}`;

          submissions.push({
            id,
            status,
            problemName,
            problemNumber,
            user: scrapedUsername,
          });
        });

        console.log(`Successfully scraped ${submissions.length} submission entries`);

        // Resolve usernames to full names
        const resolvedSubmissions = await Promise.all(
          submissions.map(async (submission) => ({
            ...submission,
            user: await this.resolveUsername(submission.user),
          }))
        );

        return resolvedSubmissions;
      }
      return [];
    } catch (error: any) {
      console.error('Error scraping VNOI submissions:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      return [];
    }
  }
}
