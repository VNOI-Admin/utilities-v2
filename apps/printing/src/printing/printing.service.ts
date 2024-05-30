import { Injectable } from "@nestjs/common";

@Injectable()
export class PrintingService {
  getHello(): string {
    return "Hello World!";
  }
}
