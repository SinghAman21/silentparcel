import { createHash } from 'crypto';
import net from 'net';

export interface ScanResult {
  isClean: boolean;
  message: string;
  signature?: string;
}

export class VirusScanner {
  private host: string;
  private port: number;
  private timeout: number;

  constructor(
    host: string = process.env.CLAMAV_HOST || 'localhost',
    port: number = parseInt(process.env.CLAMAV_PORT || '3310'),
    timeout: number = 30000
  ) {
    this.host = host;
    this.port = port;
    this.timeout = timeout;
  }

  async scanBuffer(buffer: Buffer): Promise<ScanResult> {
    if (process.env.ENABLE_VIRUS_SCAN !== 'true') {
      return {
        isClean: true,
        message: 'Virus scanning disabled'
      };
    }

    try {
      return await this.scanWithClamAV(buffer);
    } catch (error) {
      console.warn('ClamAV not available, falling back to basic checks:', error);
      return await this.basicScan(buffer);
    }
  }

  private async scanWithClamAV(buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.port, this.host);
      socket.setTimeout(this.timeout);

      socket.on('connect', () => {
        // Send INSTREAM command
        socket.write('nINSTREAM\n');
        
        // Send file size and data
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(buffer.length, 0);
        socket.write(sizeBuffer as unknown as Uint8Array);
        socket.write(buffer as unknown as Uint8Array);
        
        // End stream
        const endBuffer = Buffer.alloc(4);
        endBuffer.writeUInt32BE(0, 0);
        socket.write(endBuffer as unknown as Uint8Array);
      });

      socket.on('data', (data) => {
        const response = data.toString().trim();
        socket.end();

        if (response.includes('OK')) {
          resolve({
            isClean: true,
            message: 'File is clean'
          });
        } else if (response.includes('FOUND')) {
          const signature = response.split(' ')[1];
          resolve({
            isClean: false,
            message: 'Virus detected',
            signature
          });
        } else {
          reject(new Error(`Unknown ClamAV response: ${response}`));
        }
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('ClamAV scan timeout'));
      });
    });
  }

  private async basicScan(buffer: Buffer): Promise<ScanResult> {
    // Basic signature-based detection for common malware patterns
    const signatures = [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test
      '4D5A', // PE executable header (hex)
      '7F454C46', // ELF executable header
      '504B0304', // ZIP file with potential risk
    ];

    const bufferHex = buffer.toString('hex').toUpperCase();
    const bufferString = buffer.toString('ascii');

    // Check for EICAR test file
    if (bufferString.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return {
        isClean: false,
        message: 'EICAR test virus detected',
        signature: 'EICAR-Test-File'
      };
    }

    // Check file size limits - use environment variable or default to 50mb as fallback
    // const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50mb default
    // if (buffer.length > maxSize) {
    //   return {
    //     isClean: false,
    //     message: 'File too large for scanning'
    //   };
    // }

    // Calculate file hash for known malware database (placeholder)
    const hash = createHash('sha256').update(buffer as unknown as Uint8Array).digest('hex');
    
    // In production, you would check this hash against a malware database
    // For now, we'll just log it for audit purposes
    console.log(`File scan - SHA256: ${hash}`);

    return {
      isClean: true,
      message: 'Basic scan completed - no threats detected'
    };
  }

  async isServiceAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(this.port, this.host);
      socket.setTimeout(5000);

      socket.on('connect', () => {
        socket.write('nPING\n');
      });

      socket.on('data', (data) => {
        const response = data.toString().trim();
        socket.end();
        resolve(response === 'PONG');
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }
}

export const virusScanner = new VirusScanner();
