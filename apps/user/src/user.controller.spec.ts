import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './user.controller';
import { AppService } from './user.service';

describe('UserController', () => {
  let userController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    userController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(userController.getHello()).toBe('Hello World!');
    });
  });
});
