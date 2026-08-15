import React, { createContext, useContext, useState } from 'react';

const FeedContext = createContext(null);

export function FeedProvider({ children, initialPosts = [] }) {
  const [posts, setPosts] = useState(initialPosts);

  const addPost = (newPostPayload) => {
    setPosts(prev => [newPostPayload, ...prev]);
  };

  return (
    <FeedContext.Provider value={{ posts, setPosts, addPost }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    return { posts: [], setPosts: () => {}, addPost: () => {} };
  }
  return context;
}

export default FeedContext;
