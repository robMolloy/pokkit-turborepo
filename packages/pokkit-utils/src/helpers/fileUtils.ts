export async function areFilesEqual(file1: File, file2: File): Promise<boolean> {
  return (
    file1.name === file2.name &&
    file1.type === file2.type &&
    file1.size === file2.size &&
    file1.lastModified === file2.lastModified &&
    (await areFileContentsEqual(file1, file2))
  );
}

export async function areFileContentsEqual(file1: File, file2: File): Promise<boolean> {
  if (file1.size !== file2.size) return false;

  const [buffer1, buffer2] = await Promise.all([file1.arrayBuffer(), file2.arrayBuffer()]);

  const bytes1 = new Uint8Array(buffer1);
  const bytes2 = new Uint8Array(buffer2);

  return bytes1.every((byte, index) => byte === bytes2[index]);
}

export async function areFileImagesEqual(file1: File, file2: File): Promise<boolean> {
  const [image1, image2] = await Promise.all([createImageBitmap(file1), createImageBitmap(file2)]);

  if (image1.width !== image2.width || image1.height !== image2.height) {
    return false;
  }

  const canvas1 = new OffscreenCanvas(image1.width, image1.height);
  const canvas2 = new OffscreenCanvas(image2.width, image2.height);

  const context1 = canvas1.getContext("2d")!;
  const context2 = canvas2.getContext("2d")!;

  context1.drawImage(image1, 0, 0);
  context2.drawImage(image2, 0, 0);

  const data1 = context1.getImageData(0, 0, image1.width, image1.height).data;

  const data2 = context2.getImageData(0, 0, image2.width, image2.height).data;

  return data1.every((value, index) => value === data2[index]);
}
