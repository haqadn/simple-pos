// ESC/POS Command Constants and Builder

export const ESC = 0x1b;
export const GS = 0x1d;
export const FS = 0x1c;
export const LF = 0x0a;

export const Commands = {
  // Initialization
  INIT: [ESC, 0x40],

  // Text alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Text emphasis
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],

  // Text size (using ESC !)
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH: [ESC, 0x21, 0x20],
  DOUBLE_SIZE: [ESC, 0x21, 0x30],

  // Underline
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  UNDERLINE_DOUBLE: [ESC, 0x2d, 0x02],

  // Line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],

  // Paper handling
  CUT_PAPER: [GS, 0x56, 0x00],
  PARTIAL_CUT: [GS, 0x56, 0x01],

  // Cash drawer
  DRAWER_KICK_PIN2: [ESC, 0x70, 0x00, 0x19, 0xfa],
  DRAWER_KICK_PIN5: [ESC, 0x70, 0x01, 0x19, 0xfa],
} as const;

// Text encoder for converting strings to bytes
const textEncoder = new TextEncoder();

/**
 * ESC/POS command builder with fluent API
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  /**
   * Initialize printer (reset to default state)
   */
  init(): this {
    this.buffer.push(...Commands.INIT);
    return this;
  }

  /**
   * Add raw bytes to buffer
   */
  raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Add text (UTF-8 encoded)
   */
  text(str: string): this {
    const bytes = textEncoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Add newline (line feed)
   */
  newline(): this {
    this.buffer.push(LF);
    return this;
  }

  /**
   * Feed specified number of lines
   */
  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  /**
   * Set text alignment
   */
  align(alignment: 'left' | 'center' | 'right'): this {
    switch (alignment) {
      case 'left':
        this.buffer.push(...Commands.ALIGN_LEFT);
        break;
      case 'center':
        this.buffer.push(...Commands.ALIGN_CENTER);
        break;
      case 'right':
        this.buffer.push(...Commands.ALIGN_RIGHT);
        break;
    }
    return this;
  }

  alignLeft(): this {
    return this.align('left');
  }

  alignCenter(): this {
    return this.align('center');
  }

  alignRight(): this {
    return this.align('right');
  }

  /**
   * Set bold mode
   */
  bold(on: boolean = true): this {
    this.buffer.push(...(on ? Commands.BOLD_ON : Commands.BOLD_OFF));
    return this;
  }

  /**
   * Set text size
   */
  size(size: 'normal' | 'double-height' | 'double-width' | 'double'): this {
    switch (size) {
      case 'normal':
        this.buffer.push(...Commands.NORMAL_SIZE);
        break;
      case 'double-height':
        this.buffer.push(...Commands.DOUBLE_HEIGHT);
        break;
      case 'double-width':
        this.buffer.push(...Commands.DOUBLE_WIDTH);
        break;
      case 'double':
        this.buffer.push(...Commands.DOUBLE_SIZE);
        break;
    }
    return this;
  }

  doubleSize(): this {
    return this.size('double');
  }

  normalSize(): this {
    return this.size('normal');
  }

  /**
   * Set underline mode
   */
  underline(mode: boolean | 'double' = true): this {
    if (mode === 'double') {
      this.buffer.push(...Commands.UNDERLINE_DOUBLE);
    } else if (mode) {
      this.buffer.push(...Commands.UNDERLINE_ON);
    } else {
      this.buffer.push(...Commands.UNDERLINE_OFF);
    }
    return this;
  }

  /**
   * Print a separator line
   */
  separator(char: string = '-', width: number = 48): this {
    this.text(char.repeat(width));
    this.newline();
    return this;
  }

  /**
   * Print two columns: left-aligned text and right-aligned text
   */
  columns(left: string, right: string, width: number = 48): this {
    const maxLeft = width - right.length - 1; // at least 1 space between columns
    const truncatedLeft = left.length > maxLeft
      ? left.substring(0, Math.max(0, maxLeft - 3)) + '...'
      : left;
    const spaces = Math.max(1, width - truncatedLeft.length - right.length);
    this.text(truncatedLeft + ' '.repeat(spaces) + right);
    this.newline();
    return this;
  }

  /**
   * Print three columns
   */
  threeColumns(left: string, center: string, right: string, width: number = 48): this {
    const totalText = left.length + center.length + right.length;
    const totalSpaces = Math.max(2, width - totalText);
    const leftSpaces = Math.floor(totalSpaces / 2);
    const rightSpaces = totalSpaces - leftSpaces;
    this.text(left + ' '.repeat(leftSpaces) + center + ' '.repeat(rightSpaces) + right);
    this.newline();
    return this;
  }

  /**
   * Cut paper (full cut)
   */
  cut(partial: boolean = false): this {
    this.buffer.push(...(partial ? Commands.PARTIAL_CUT : Commands.CUT_PAPER));
    return this;
  }

  /**
   * Kick cash drawer
   */
  drawerKick(pin: 2 | 5 = 2): this {
    this.buffer.push(
      ...(pin === 2 ? Commands.DRAWER_KICK_PIN2 : Commands.DRAWER_KICK_PIN5)
    );
    return this;
  }

  /**
   * Add raster image data
   * imageData should be pre-processed 1-bit bitmap data
   * widthBytes is width in bytes (width in pixels / 8)
   */
  rasterImage(imageData: Uint8Array, widthBytes: number, height: number): this {
    // GS v 0 - Print raster bit image
    // GS v 0 m xL xH yL yH d1...dk
    // m = 0: normal mode
    this.buffer.push(
      GS,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff
    );
    this.buffer.push(...imageData);
    return this;
  }

  /**
   * Build the final byte array
   */
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Get buffer length
   */
  get length(): number {
    return this.buffer.length;
  }
}
