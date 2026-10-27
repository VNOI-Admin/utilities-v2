import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SECURITY_REPORT_SCRIPT_NAME, SecurityReportService } from './security-report.service';

const SCRIPT_PATH = path.resolve(__dirname, '../../../../scripts/remote', SECURITY_REPORT_SCRIPT_NAME);

function makeUserModel(usernames: string[]) {
  return {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(usernames.map((username) => ({ username }))),
      }),
    }),
  };
}

// Runs the real script with /opt/vnoi pointed at a scratch tree.
function runScript(features: string, dirty: boolean): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'secreport-'));
  try {
    mkdirSync(path.join(root, 'run'), { recursive: true });
    writeFileSync(path.join(root, 'config.sh'), `VNOI_SEC_FEATURES="${features}"\n`);
    if (dirty) writeFileSync(path.join(root, 'run/integrity-dirty'), '');
    const script = readFileSync(SCRIPT_PATH, 'utf8').replaceAll('/opt/vnoi', root);
    return execFileSync('bash', ['-c', script], { encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function makeRemoteControl() {
  return { createJob: jest.fn() };
}

describe('SecurityReportService', () => {
  it('ships as a seeded preset script next to the other remote scripts', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    expect(content).toContain('/opt/vnoi/store/log/aide.log');
    expect(content).toContain('/opt/vnoi/store/log/audit.log');
    expect(content).toContain('integrity-dirty');
  });

  it('says integrity is off instead of reporting a clean machine when AIDE is not enabled', () => {
    expect(runScript('audit,grub_pw,secure_boot,sign', false)).toContain('=== integrity-dirty\nintegrity off');
    expect(runScript('audit,integrity,sign', false)).toContain('=== integrity-dirty\nabsent');
    expect(runScript('audit,integrity,sign', true)).toContain('=== integrity-dirty\npresent');
  });

  it('runs the preset script against the whole fleet when no targets are given', async () => {
    const userModel = makeUserModel(['machine-b', 'machine-a']);
    const remoteControl = makeRemoteControl();
    const service = new SecurityReportService(remoteControl as any, userModel as any);

    await service.runSecurityReport('admin:1');

    expect(userModel.find).toHaveBeenCalledWith({
      role: { $in: ['contestant', 'guest'] },
      isActive: true,
      vpnIpAddress: { $ne: null },
      'keyPair.privateKey': { $ne: null },
    });
    expect(remoteControl.createJob).toHaveBeenCalledWith('admin:1', {
      scriptName: SECURITY_REPORT_SCRIPT_NAME,
      targets: ['machine-a', 'machine-b'],
    });
  });

  it('passes explicit targets through without resolving the fleet', async () => {
    const userModel = makeUserModel(['machine-a']);
    const remoteControl = makeRemoteControl();
    const service = new SecurityReportService(remoteControl as any, userModel as any);

    await service.runSecurityReport('admin:1', ['machine-x', 'machine-y']);

    expect(userModel.find).not.toHaveBeenCalled();
    expect(remoteControl.createJob).toHaveBeenCalledWith('admin:1', {
      scriptName: SECURITY_REPORT_SCRIPT_NAME,
      targets: ['machine-x', 'machine-y'],
    });
  });

  it('starts nothing when the fleet is empty', async () => {
    const userModel = makeUserModel([]);
    const remoteControl = makeRemoteControl();
    const service = new SecurityReportService(remoteControl as any, userModel as any);

    await expect(service.runSecurityReport('system:scheduler')).resolves.toBeNull();
    expect(remoteControl.createJob).not.toHaveBeenCalled();
  });

  it('treats an empty explicit target list as the whole fleet', async () => {
    const userModel = makeUserModel(['machine-a']);
    const remoteControl = makeRemoteControl();
    const service = new SecurityReportService(remoteControl as any, userModel as any);

    await service.runSecurityReport('system:scheduler', []);

    expect(userModel.find).toHaveBeenCalled();
    expect(remoteControl.createJob).toHaveBeenCalledWith('system:scheduler', {
      scriptName: SECURITY_REPORT_SCRIPT_NAME,
      targets: ['machine-a'],
    });
  });
});
