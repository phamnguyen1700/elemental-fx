import type { ResourceHandle, TextureResource, VisualResource } from "../resources";

export interface LoadedTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface TextureLoadOptions {
  flipY?: boolean;
  premultiplyAlpha?: boolean;
  generateMipmaps?: boolean;
}

export async function loadImageSource(handle: ResourceHandle): Promise<HTMLImageElement> {
  if (typeof handle !== "string") {
    throw new Error("WebGL image resources require a URL string handle.");
  }

  const image = new Image();
  image.decoding = "async";
  if (!handle.startsWith("data:") && !handle.startsWith("blob:")) {
    image.crossOrigin = "anonymous";
  }
  image.src = handle;
  await image.decode();
  return image;
}

export async function loadTexture2D(
  gl: WebGL2RenderingContext,
  resource: TextureResource | VisualResource | ResourceHandle,
  options: TextureLoadOptions = {}
): Promise<LoadedTexture> {
  const handle = readResourceHandle(resource);
  const image = await loadImageSource(handle);
  const texture = gl.createTexture();
  if (!texture) throw new Error("WebGL texture creation failed.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flipY === false ? 0 : 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, options.premultiplyAlpha ? 1 : 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    options.generateMipmaps === false ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  if (options.generateMipmaps !== false) gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

  return { texture, width: image.naturalWidth, height: image.naturalHeight };
}

function readResourceHandle(
  resource: TextureResource | VisualResource | ResourceHandle
): ResourceHandle {
  if (typeof resource === "string" || typeof resource === "number") return resource;
  return resource.handle;
}
