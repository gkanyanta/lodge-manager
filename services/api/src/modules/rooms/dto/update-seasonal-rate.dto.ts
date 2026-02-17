import { PartialType } from '@nestjs/swagger';
import { CreateSeasonalRateDto } from './create-seasonal-rate.dto';

export class UpdateSeasonalRateDto extends PartialType(CreateSeasonalRateDto) {}
