import z from "zod";
import PocketBase from "pocketbase";

const getRecordById = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  id: string;
  schema: T;
  signal?: AbortSignal;
}) => {
  try {
    const resp = await p.pb.collection(p.collectionName).getOne(p.id, { signal: p.signal });
    return p.schema.safeParse(resp);
  } catch (e) {
    const error = e as { message: string };
    return { success: false, error } as const;
  }
};

export const subscribeToRecordById = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  id: string;
  schema: T;
  onChange: (e: z.infer<T> | null) => void;
  signal?: AbortSignal;
}) => {
  try {
    const unsub = p.pb.collection(p.collectionName).subscribe(
      p.id,
      (e) => {
        const parseResp = p.schema.safeParse(e.record);
        p.onChange(parseResp.success ? parseResp.data : null);
      },
      { signal: p.signal },
    );

    return { success: true, data: unsub } as const;
  } catch (error) {
    p.onChange(null);
    return { success: false, error } as const;
  }
};

export const smartSubscribeToRecordById = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  id: string;
  schema: T;
  onChange: (e: z.infer<T> | null) => void;
  signal?: AbortSignal;
}) => {
  const recordRespPromise = getRecordById({
    pb: p.pb,
    collectionName: p.collectionName,
    id: p.id,
    schema: p.schema,
    signal: p.signal,
  });

  const subscribeRespPromise = subscribeToRecordById({
    pb: p.pb,
    collectionName: p.collectionName,
    id: p.id,
    schema: p.schema,
    onChange: p.onChange,
    signal: p.signal,
  });

  const recordResp = await recordRespPromise;
  p.onChange(recordResp.success ? recordResp.data : null);

  const subscribeResp = await subscribeRespPromise;
  return subscribeResp;
};
