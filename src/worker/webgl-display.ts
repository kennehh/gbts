import type { IDisplay } from "@/core/ppu/rendering";
import vertShader from "./webgl.vert?raw";
import fragShader from "./webgl.frag?raw";

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;
const COLORS_PER_PALETTE = 4;
const COLOR_COMPONENTS = 3;

interface WebGLResources {
    program: WebGLProgram;
    frameTexture: WebGLTexture;
    vertexBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
}

export class WebGLDisplay implements IDisplay {
    private readonly frameData = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);
    private readonly palette = new Float32Array(COLORS_PER_PALETTE * COLOR_COMPONENTS);
    private yOffsetLookup = new Uint16Array(SCREEN_HEIGHT);
    private readonly gl: WebGL2RenderingContext;
    private readonly resources: WebGLResources;
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
        
        // Set default palette
        this.setPalette([
            [255, 255, 255],  // Lightest
            [170, 170, 170],  // Light
            [85, 85,    85],  // Dark
            [0,   0,     0]   // Darkest
        ]);

        for (let i = 0; i < SCREEN_HEIGHT; ++i) {
            this.yOffsetLookup[i] = i * SCREEN_WIDTH;
        }
    }

    setPixel(y: number, x: number, colorId: number): void {
        const offset = this.yOffsetLookup[y] + x;
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

    setPalette(palette: [number, number, number][]): void {
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
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertShader);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragShader);
        
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