import { uploadBytes, ref, getStorage, getDownloadURL } from "firebase/storage";

export const saveFile = async (path: string, file: File | Buffer) => {
  const storageRef = ref(getStorage(), path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
