import { IsOptional, IsString } from 'class-validator';

export class editBookmarkDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  link: string;
}
