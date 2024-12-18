import { IDisplay } from '../core/ppu/display';

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;
const COLORS_PER_PALETTE = 4;
const COLOR_COMPONENTS = 3;

const VERTEX_SHADER = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }
`;

const FRAGMENT_SHADER = `#version 300 es
    precision lowp float;
    
    uniform sampler2D u_image;
    uniform vec3 u_palette[4];
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    void main() {
        float colorIndex = texture(u_image, v_texCoord).r;
        int index = int(colorIndex * 255.0);
        
        vec3 color = u_palette[index];
        fragColor = vec4(color, 1.0);
    }
`;

type WebGLResources = {
    program: WebGLProgram;
    frameTexture: WebGLTexture;
    vertexBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
}

export class WebGLDisplay implements IDisplay {
    private readonly gl: WebGL2RenderingContext;
    private readonly resources: WebGLResources;
    private readonly frameData: Uint8Array;
    private readonly palette: Float32Array;
    private dirty = false;

    constructor(canvas: OffscreenCanvas) {
        const gl = canvas.getContext('webgl2', {
            antialias: false,
            depth: false,
            alpha: false,
            preserveDrawingBuffer: false
        });
        
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        
        this.gl = gl;
        this.resources = this.initializeWebGLResources();
        this.frameData = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);
        this.palette = new Float32Array(COLORS_PER_PALETTE * COLOR_COMPONENTS);
        
        // Set default palette
        this.setPalette([
            [155, 188, 15],  // Lightest
            [139, 172, 15],  // Light
            [48, 98, 48],    // Dark
            [15, 56, 15]     // Darkest
        ]);
    }

    setPixel(y: number, x: number, colorId: number): void {
        if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) {
            return;
        }
        const offset = y * SCREEN_WIDTH + x;
        if (this.frameData[offset] !== colorId) {
            this.frameData[offset] = colorId;
            this.dirty = true;
        }
    }

    renderFrame(): void {
        if (!this.dirty) {
            return;
        }

        const { program, frameTexture } = this.resources;
        this.gl.useProgram(program);

        // Update texture with new frame data
        this.gl.bindTexture(this.gl.TEXTURE_2D, frameTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.R8,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0,
            this.gl.RED,
            this.gl.UNSIGNED_BYTE,
            this.frameData
        );

        // Set palette uniform
        const paletteLoc = this.gl.getUniformLocation(program, 'u_palette');
        this.gl.uniform3fv(paletteLoc, this.palette);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        this.dirty = false;
    }

    setPalette(palette: Array<[number, number, number]>): void {
        if (palette.length !== COLORS_PER_PALETTE) {
            throw new Error(`Palette must contain exactly ${COLORS_PER_PALETTE} colors`);
        }

        let i = 0;
        for (const [r, g, b] of palette) {
            this.palette[i++] = r / 255;
            this.palette[i++] = g / 255;
            this.palette[i++] = b / 255;
        }
    }

    clear(): void {
        this.frameData.fill(0);
        this.dirty = true;
        this.renderFrame();
    }

    dispose(): void {
        const { program, frameTexture, vertexBuffer, texCoordBuffer } = this.resources;
        
        this.gl.deleteProgram(program);
        this.gl.deleteTexture(frameTexture);
        this.gl.deleteBuffer(vertexBuffer);
        this.gl.deleteBuffer(texCoordBuffer);
    }

    private initializeWebGLResources(): WebGLResources {
        const program = this.createProgram();
        const { vertexBuffer, texCoordBuffer } = this.createBuffers(program);
        const frameTexture = this.createFrameTexture();

        return {
            program,
            frameTexture,
            vertexBuffer,
            texCoordBuffer
        };
    }

    private createProgram(): WebGLProgram {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        
        if (!vertexShader || !fragmentShader) {
            throw new Error('Failed to create shaders');
        }

        const program = this.gl.createProgram();
        if (!program) {
            throw new Error('Failed to create program');
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        // Clean up shaders after linking
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Program link failed: ${error}`);
        }

        return program;
    }

    private createBuffers(program: WebGLProgram): { vertexBuffer: WebGLBuffer, texCoordBuffer: WebGLBuffer } {
        // Create vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        if (!vertexBuffer) throw new Error('Failed to create vertex buffer');
        
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,  1, 1
        ]);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const positionLoc = this.gl.getAttribLocation(program, 'a_position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

        // Create texture coordinate buffer
        const texCoordBuffer = this.gl.createBuffer();
        if (!texCoordBuffer) throw new Error('Failed to create texture coordinate buffer');
        
        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,  1, 0
        ]);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        const texCoordLoc = this.gl.getAttribLocation(program, 'a_texCoord');
        this.gl.enableVertexAttribArray(texCoordLoc);
        this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 0, 0);

        return { vertexBuffer, texCoordBuffer };
    }

    private createFrameTexture(): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) throw new Error('Failed to create texture');

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return texture;
    }

    private createShader(type: number, source: string): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) {
            console.error('Failed to create shader');
            return null;
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}