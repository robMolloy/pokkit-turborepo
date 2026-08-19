export const pokkitDbBlogTestsMetadata = {
  pokkitDbBlogPostsCollectionCreate: {
    portNumber: 8500,
    name: "pokkitDbBlogPostsCollectionCreate",
  },
  pokkitDbBlogPostsCollectionDelete: {
    portNumber: 8501,
    name: "pokkitDbBlogPostsCollectionDelete",
  },
  pokkitDbBlogPostsCollectionList: {
    portNumber: 8502,
    name: "pokkitDbBlogPostsCollectionList",
  },
  pokkitDbBlogPostsCollectionUpdate: {
    portNumber: 8503,
    name: "pokkitDbBlogPostsCollectionUpdate",
  },
  pokkitDbBlogPostsCollectionView: {
    portNumber: 8504,
    name: "pokkitDbBlogPostsCollectionView",
  },
  pokkitDbBlogPostImagesCollectionCreate: {
    portNumber: 8505,
    name: "pokkitDbBlogPostImagesCollectionCreate",
  },
  pokkitDbBlogPostImagesCollectionDelete: {
    portNumber: 8506,
    name: "pokkitDbBlogPostImagesCollectionDelete",
  },
  pokkitDbBlogPostImagesCollectionList: {
    portNumber: 8507,
    name: "pokkitDbBlogPostImagesCollectionList",
  },
  pokkitDbBlogPostImagesCollectionUpdate: {
    portNumber: 8508,
    name: "pokkitDbBlogPostImagesCollectionUpdate",
  },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
