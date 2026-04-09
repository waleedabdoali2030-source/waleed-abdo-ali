export interface Project {
  id?: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  quantity: number;
  viewCount: number;
  starCount: number;
  createdAt: string;
  ownerId: string;
}

export interface Comment {
  id?: string;
  projectId: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface SiteStat {
  id?: string;
  totalVisits: number;
}

export interface Inquiry {
  id?: string;
  projectId: string;
  projectName: string;
  userName: string;
  userEmail?: string;
  message: string;
  createdAt: string;
}

export interface SiteSettings {
  whatsappNumber: string;
  contactMessage: string;
}
