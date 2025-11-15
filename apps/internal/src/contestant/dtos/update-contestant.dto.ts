import { PartialType } from '@nestjs/swagger';
import { CreateContestantDto } from './create-contestant.dto';

export class UpdateContestantDto extends PartialType(CreateContestantDto) {}
