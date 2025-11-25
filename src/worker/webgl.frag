#version 300 es
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
