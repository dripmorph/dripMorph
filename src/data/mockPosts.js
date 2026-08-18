import techwearImg from '../assets/techwear_look.png';
import cyberpunkImg from '../assets/cyberpunk_look.png';
import minimalistImg from '../assets/minimalist_look.png';

export const MOCK_POSTS = [
  {
    id: 1,
    username: 'streetstyle_icon',
    location: 'Tokyo, JP',
    aiScore: '8.7/10',
    image: techwearImg,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    likes: 12400,
    comments: 842,
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    products: [
      {
        id: 'p1',
        name: 'Tactical Harness Bomber Jacket',
        price: '$189.00',
        image: techwearImg,
      },
      {
        id: 'p2',
        name: 'High-Collar Knit Turtleneck',
        price: '$45.00',
        image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&h=100&fit=crop',
      },
      {
        id: 'p3',
        name: 'Modular Cargo Strap Pants',
        price: '$110.00',
        image: 'https://images.unsplash.com/photo-1517423568366-8b83523034fd?w=100&h=100&fit=crop',
      }
    ]
  },
  {
    id: 2,
    username: 'neon_wanderer',
    location: 'Neo-Seoul, KR',
    aiScore: '9.2/10',
    image: cyberpunkImg,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    likes: 18900,
    comments: 1205,
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    products: [
      {
        id: 'p4',
        name: 'Reflective Neon Windbreaker v2',
        price: '$210.00',
        image: cyberpunkImg,
      },
      {
        id: 'p5',
        name: 'Urban Cyber Tech Sling Bag',
        price: '$75.00',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop',
      },
      {
        id: 'p6',
        name: 'Revolt Platform Combat Boots',
        price: '$250.00',
        image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=100&h=100&fit=crop',
      }
    ]
  },
  {
    id: 3,
    username: 'brutal_aesthetic',
    location: 'Berlin, DE',
    aiScore: '8.5/10',
    image: minimalistImg,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    likes: 9320,
    comments: 498,
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    products: [
      {
        id: 'p7',
        name: 'Brutalist Oversized Wool Coat',
        price: '$340.00',
        image: minimalistImg,
      },
      {
        id: 'p8',
        name: 'Structured Raw Indigo Denim',
        price: '$145.00',
        image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&h=100&fit=crop',
      }
    ]
  },
  {
    id: 101,
    username: 'minimalist_enzo',
    location: 'Seattle, WA',
    aiScore: '8.9/10',
    image: cyberpunkImg,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    likes: 347,
    comments: 28,
    caption: 'Cyberpunk precision. Every layer intentional. #acronym #techwear',
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    products: [
      { id: 'e1', name: 'Cyberpunk Tailored Coat', price: '$299.00', brand: 'Yohji Yamamoto', image: cyberpunkImg },
      { id: 'e2', name: 'Pleated Tactical Pants', price: '$180.00', brand: 'Acronym', image: cyberpunkImg }
    ]
  },
  {
    id: 102,
    username: 'minimalist_enzo',
    location: 'Seattle, WA',
    aiScore: '8.5/10',
    image: techwearImg,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    likes: 211,
    comments: 14,
    caption: 'Tactical silhouettes. Muted palette. The formula. #techwear #minimalist',
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    products: [
      { id: 'e3', name: 'Modular Tactical Vest', price: '$220.00', brand: 'Nike ACG', image: techwearImg },
      { id: 'e4', name: 'Arc-Seam Cargo Pants', price: '$310.00', brand: 'Acronym', image: techwearImg }
    ]
  }
];
