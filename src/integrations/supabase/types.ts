export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      inquiries: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          item_id: string | null
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          item_id?: string | null
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          item_id?: string | null
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          depth_cm: number | null
          description: string | null
          height_cm: number | null
          id: string
          images: string[]
          materials: string[] | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          origin: string | null
          price: number | null
          slug: string
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          materials?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          origin?: string | null
          price?: number | null
          slug: string
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          materials?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          origin?: string | null
          price?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      reconciliation_matches: {
        Row: {
          applied_at: string | null
          applied_inventory_item_id: string | null
          confidence: number | null
          conflicts: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["match_decision"]
          id: string
          local_image_path: string | null
          match_reasons: Json
          scraped_product_id: string | null
          updated_at: string
          xlsx_current_rms_id: string | null
          xlsx_name: string | null
          xlsx_product_group: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_inventory_item_id?: string | null
          confidence?: number | null
          conflicts?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["match_decision"]
          id?: string
          local_image_path?: string | null
          match_reasons?: Json
          scraped_product_id?: string | null
          updated_at?: string
          xlsx_current_rms_id?: string | null
          xlsx_name?: string | null
          xlsx_product_group?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_inventory_item_id?: string | null
          confidence?: number | null
          conflicts?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["match_decision"]
          id?: string
          local_image_path?: string | null
          match_reasons?: Json
          scraped_product_id?: string | null
          updated_at?: string
          xlsx_current_rms_id?: string | null
          xlsx_name?: string | null
          xlsx_product_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_matches_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_runs: {
        Row: {
          created_at: string
          credits_estimated: number | null
          credits_used: number | null
          error_message: string | null
          finished_at: string | null
          firecrawl_job_id: string | null
          id: string
          items_completed: number
          items_total: number | null
          notes: string | null
          phase: Database["public"]["Enums"]["scrape_phase"]
          source_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["scrape_run_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_estimated?: number | null
          credits_used?: number | null
          error_message?: string | null
          finished_at?: string | null
          firecrawl_job_id?: string | null
          id?: string
          items_completed?: number
          items_total?: number | null
          notes?: string | null
          phase: Database["public"]["Enums"]["scrape_phase"]
          source_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_estimated?: number | null
          credits_used?: number | null
          error_message?: string | null
          finished_at?: string | null
          firecrawl_job_id?: string | null
          id?: string
          items_completed?: number
          items_total?: number | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["scrape_phase"]
          source_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
          updated_at?: string
        }
        Relationships: []
      }
      scraped_categories: {
        Row: {
          display_order: number | null
          id: string
          name: string
          parent_slug: string | null
          product_count: number | null
          raw: Json | null
          run_id: string
          scraped_at: string
          slug: string
          url: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          name: string
          parent_slug?: string | null
          product_count?: number | null
          raw?: Json | null
          run_id: string
          scraped_at?: string
          slug: string
          url: string
        }
        Update: {
          display_order?: number | null
          id?: string
          name?: string
          parent_slug?: string | null
          product_count?: number | null
          raw?: Json | null
          run_id?: string
          scraped_at?: string
          slug?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_categories_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_product_images: {
        Row: {
          alt_text: string | null
          height: number | null
          id: string
          image_url: string
          is_hero: boolean
          position: number
          scraped_product_id: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          height?: number | null
          id?: string
          image_url: string
          is_hero?: boolean
          position?: number
          scraped_product_id: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          height?: number | null
          id?: string
          image_url?: string
          is_hero?: boolean
          position?: number
          scraped_product_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_products: {
        Row: {
          breadcrumb: string[] | null
          category_slug: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          raw: Json | null
          run_id: string
          scraped_at: string
          slug: string
          subcategory_slug: string | null
          title: string
          url: string
        }
        Insert: {
          breadcrumb?: string[] | null
          category_slug?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          raw?: Json | null
          run_id: string
          scraped_at?: string
          slug: string
          subcategory_slug?: string | null
          title: string
          url: string
        }
        Update: {
          breadcrumb?: string[] | null
          category_slug?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          raw?: Json | null
          run_id?: string
          scraped_at?: string
          slug?: string
          subcategory_slug?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_products_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_urls: {
        Row: {
          classification_reason: string | null
          depth: number | null
          discovered_at: string
          id: string
          kind: Database["public"]["Enums"]["scraped_url_kind"]
          path: string
          run_id: string
          url: string
        }
        Insert: {
          classification_reason?: string | null
          depth?: number | null
          discovered_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["scraped_url_kind"]
          path: string
          run_id: string
          url: string
        }
        Update: {
          classification_reason?: string | null
          depth?: number | null
          discovered_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["scraped_url_kind"]
          path?: string
          run_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_urls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      item_status: "available" | "reserved" | "sold" | "draft"
      match_decision: "pending" | "approved" | "rejected" | "needs_review"
      scrape_phase: "map" | "category_scrape" | "product_scrape" | "reconcile"
      scrape_run_status:
        | "pending"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      scraped_url_kind:
        | "unclassified"
        | "category_index"
        | "product_detail"
        | "nav_page"
        | "noise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      item_status: ["available", "reserved", "sold", "draft"],
      match_decision: ["pending", "approved", "rejected", "needs_review"],
      scrape_phase: ["map", "category_scrape", "product_scrape", "reconcile"],
      scrape_run_status: [
        "pending",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      scraped_url_kind: [
        "unclassified",
        "category_index",
        "product_detail",
        "nav_page",
        "noise",
      ],
    },
  },
} as const
