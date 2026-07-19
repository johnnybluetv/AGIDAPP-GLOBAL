export type Category = "LLM & Chat" | "Image & Art" | "Developer Tools" | "Productivity" | "Audio & Video" | "Other";
export type PlatformType = "Web App" | "Software (Desktop)" | "Mobile / APK" | "API / Platform";

export interface AiTool {
  id: string;
  name: string;
  category: Category;
  type: PlatformType;
  url: string;
  apk?: string;
  desc: string;
  upvotes: number;
  commentsCount?: number;
  tags?: string[];
  authorId?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  averageRating?: number;
  totalRatingsCount?: number;
  visitCount?: number;
  mediaFiles?: { url: string; type: 'image' | 'video' | 'document'; name: string }[];
  // Technical Metadata Fields
  license?: string;
  integrations?: string[];
  apiAvailable?: boolean;
  deployment?: string;
  framework?: string;
  pricing?: string;
  // Social links
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  linkedin?: string;
  gmail?: string;
}

export interface ClickLog {
  id: string;
  toolId: string;
  toolName: string;
  userId?: string;
  timestamp: any;
  type: 'visit' | 'social_click' | 'internal_view';
  platform?: string; // 'instagram', 'tiktok', etc or 'official_site'
  location?: {
    country?: string;
    city?: string;
    region?: string;
    ip?: string;
  };
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  bio?: string;
  website?: string;
  skills?: string[];
  headline?: string;
  currentPosition?: string;
  location?: string;
  endorsements?: Record<string, string[]>; // skill -> user UIDs list
  recommendations?: { id: string; fromId: string; fromName: string; fromPhoto?: string; text: string; createdAt: any }[];
  updatedAt: any;
  lastSeen?: any;
  followersCount?: number;
  followingCount?: number;
  connectionsCount?: number;
}

export interface UserActivity {
  id: string;
  type: 'submission' | 'favorite' | 'upvote';
  targetId: string;
  targetName: string;
  timestamp: any;
}

export type UserRole = "Admin" | "Manager" | "Editor" | "User";

export interface Comment {
  id: string;
  toolId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
  likesCount?: number;
  parentId?: string;
}

export interface CuratedProject {
  id: string;
  name: string;
  desc?: string;
  createdAt: any;
}

export interface Bookmark {
  id: string;
  toolId: string;
  projectId: string | null;
  bookmarkedAt: any;
}

export interface AdminRole {
  email: string;
  role: UserRole;
  addedBy: string;
  createdAt: any;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorEmail: string;
  authorRole: UserRole;
  createdAt: any;
  updatedAt: any;
  tags?: string[];
  status: 'published' | 'draft';
  views?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  videoEmbedUrl?: string;
  likesCount?: number;
}

export const CATEGORIES: Category[] = ["LLM & Chat", "Image & Art", "Developer Tools", "Productivity", "Audio & Video", "Other"];
export const PLATFORM_TYPES: PlatformType[] = ["Web App", "Software (Desktop)", "Mobile / APK", "API / Platform"];
