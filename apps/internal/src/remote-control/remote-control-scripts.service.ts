import { RemoteControlScript, type RemoteControlScriptDocument } from '@libs/common-db/schemas/remoteControlScript.schema';
import { getErrorMessage } from '@libs/common/helper/error';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { sha256Hex } from './utils/sha256';

@Injectable()
export class RemoteControlScriptsService {
  constructor(
    @InjectModel(RemoteControlScript.name)
    private remoteControlScriptModel: Model<RemoteControlScriptDocument>,
  ) {}

  async listScripts(): Promise<RemoteControlScript[]> {
    return await this.remoteControlScriptModel.find().select('-content').sort({ name: 1 }).lean();
  }

  async createScript(name: string, content: string): Promise<RemoteControlScript> {
    try {
      const existing = await this.remoteControlScriptModel.findOne({ name }).lean();
      if (existing) {
        throw new BadRequestException('Script already exists');
      }

      const hash = sha256Hex(content);
      const script = await this.remoteControlScriptModel.create({ name, content, hash });
      await script.save();
      return script.toObject();
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async getScriptByName(name: string): Promise<RemoteControlScript> {
    const script = await this.remoteControlScriptModel.findOne({ name }).lean();
    if (!script) {
      throw new BadRequestException('Script not found');
    }
    return script;
  }

  async updateScriptContent(name: string, content: string): Promise<RemoteControlScript> {
    try {
      const script = await this.remoteControlScriptModel.findOne({ name });
      if (!script) {
        throw new BadRequestException('Script not found');
      }

      script.content = content;
      script.hash = sha256Hex(content);

      await script.save();

      return script.toObject();
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deleteScript(name: string): Promise<{ success: true }> {
    const script = await this.remoteControlScriptModel.findOne({ name });
    if (!script) {
      throw new BadRequestException('Script not found');
    }

    await script.deleteOne();
    return { success: true };
  }
}

