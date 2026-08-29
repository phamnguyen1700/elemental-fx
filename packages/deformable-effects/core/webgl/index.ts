export function createGlProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  if (!vertexShader) throw new Error("Vertex shader creation failed");
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error("Vertex Shader: " + gl.getShaderInfoLog(vertexShader));
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragmentShader) throw new Error("Fragment shader creation failed");
  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error("Fragment Shader: " + gl.getShaderInfoLog(fragmentShader));
  }

  const program = gl.createProgram();
  if (!program) throw new Error("Program creation failed");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Program Link: " + gl.getProgramInfoLog(program));
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return {
    program,
    use: () => gl.useProgram(program),
    destroy: () => gl.deleteProgram(program)
  };
}

export * from "./textures";
