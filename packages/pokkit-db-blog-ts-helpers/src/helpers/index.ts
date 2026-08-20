import { formatDateForPb } from "@repo/pokkit-utils";

export const blogPostsCollectionName = "blogPosts";
export const blogPostImagesCollectionName = "blogPostImages";

export type TBlogPostPayloadCreateData = {
  title: string;
  subtitle: string;
  content: string;
  blogPostImageId?: string;
  blogPostImageCaption?: string;
  publishAt?: string | null;
};

const createRandomString = () => `test${Math.floor(Math.random() * 10000000)}`;

const blogPostPayloadBuilderInit = {
  forCreateData: <T extends TBlogPostPayloadCreateData>(p: T) =>
    ({
      title: p.title,
      content: p.content,
      publishAt: p.publishAt,
    }) as T,
};

export const blogPostPayloadBuilder = {
  ...blogPostPayloadBuilderInit,
  forCreateRandomData: (p?: Partial<TBlogPostPayloadCreateData>) => {
    const randomString = createRandomString();
    return blogPostPayloadBuilderInit.forCreateData({
      title: p?.title ?? randomString,
      subtitle: p?.subtitle ?? randomString,
      content: p?.content ?? randomString,
      publishAt: p?.publishAt === undefined ? formatDateForPb(new Date()) : p.publishAt,
    });
  },
};
