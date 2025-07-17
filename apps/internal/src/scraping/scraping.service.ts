import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface RankingEntry {
  rank: number;
  teamName: string;
  points: number;
  problems: string[];
}

@Injectable()
export class ScrapingService {
  async scrapeVNOIRanking(): Promise<RankingEntry[]> {
    try {
      const url = 'https://oj.vnoi.info/contest/vnoicup25_r2/ranking/';

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
            if (index >= 10) return; // Only get top 10

            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 3) {
              const rankText = $row.find('td').first().text().trim();
              const teamNameText = $row.find('td').eq(1).find('a').first().text().trim();
              // remove the div inside
              const pointsText = $row.find('td').eq(2).find('a').html()?.trim().split('<div')[0] ?? '0';

              const rank = Number.parseInt(rankText) || index + 1;
              const teamName = teamNameText || `Team ${index + 1}`;
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
                teamName,
                points,
                problems,
              });
            }
          });
          break;
        }
      }

      if (!foundRows) {
        console.log('No ranking table found, using mock data');
        return this.getMockRankingData();
      }

      console.log(`Successfully scraped ${rankings.length} ranking entries`);
      return rankings;
    } catch (error: any) {
      console.error('Error scraping VNOI ranking:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      // Return mock data if scraping fails
      return this.getMockRankingData();
    }
  }

  private getMockRankingData(): RankingEntry[] {
    return [
      { rank: 1, teamName: 'Stanford', points: 100, problems: ['A AC', 'B AC', 'C AC'] },
      { rank: 2, teamName: 'MIT', points: 95, problems: ['A AC', 'B AC', 'C WA'] },
      { rank: 3, teamName: 'Peking U', points: 90, problems: ['A AC', 'B AC'] },
      { rank: 4, teamName: 'Harvard', points: 85, problems: ['A AC', 'B WA'] },
      { rank: 5, teamName: 'UJ', points: 80, problems: ['A AC'] },
      { rank: 6, teamName: 'ENS Paris', points: 75, problems: ['A WA'] },
      { rank: 7, teamName: 'Kazakh-British TU', points: 70, problems: ['A AC'] },
      { rank: 8, teamName: 'Team Alpha', points: 65, problems: ['A WA'] },
      { rank: 9, teamName: 'Team Beta', points: 60, problems: ['A WA'] },
      { rank: 10, teamName: 'Team Gamma', points: 55, problems: ['A WA'] },
    ];
  }
}
