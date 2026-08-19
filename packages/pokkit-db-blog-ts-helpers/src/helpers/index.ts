export const blogPostsCollectionName = "blogPosts";
export const blogPostImagesCollectionName = "blogPostImages";

export type TBlogPostPayloadCreateData = {
  title: string;
  subtitle: string;
  content: string;
  blogPostImageId?: string;
  blogPostImageCaption?: string;
  publishAt?: string;
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
  forCreateRandomData: () =>
    blogPostPayloadBuilderInit.forCreateData({
      title: createRandomString(),
      subtitle: createRandomString(),
      content: createRandomString(),
      publishAt: new Date().toISOString().replace("T", " "),
    }),
};
