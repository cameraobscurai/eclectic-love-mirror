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
          color_chroma: number | null
          color_confidence: number | null
          color_family: string | null
          color_hex: string | null
          color_hex_secondary: string | null
          color_hue: number | null
          color_lightness: number | null
          color_locked: boolean
          color_needs_review: boolean
          color_notes: string | null
          color_source: string | null
          color_tagged_at: string | null
          color_temperature: string | null
          created_at: string
          depth_cm: number | null
          description: string | null
          dimensions_raw: string | null
          height_cm: number | null
          id: string
          images: string[]
          materials: string[] | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          origin: string | null
          price: number | null
          quantity: number | null
          quantity_label: string | null
          rms_id: string | null
          slug: string
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          category?: string | null
          color_chroma?: number | null
          color_confidence?: number | null
          color_family?: string | null
          color_hex?: string | null
          color_hex_secondary?: string | null
          color_hue?: number | null
          color_lightness?: number | null
          color_locked?: boolean
          color_needs_review?: boolean
          color_notes?: string | null
          color_source?: string | null
          color_tagged_at?: string | null
          color_temperature?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          dimensions_raw?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          materials?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          origin?: string | null
          price?: number | null
          quantity?: number | null
          quantity_label?: string | null
          rms_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          category?: string | null
          color_chroma?: number | null
          color_confidence?: number | null
          color_family?: string | null
          color_hex?: string | null
          color_hex_secondary?: string | null
          color_hue?: number | null
          color_lightness?: number | null
          color_locked?: boolean
          color_needs_review?: boolean
          color_notes?: string | null
          color_source?: string | null
          color_tagged_at?: string | null
          color_temperature?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          dimensions_raw?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          materials?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          origin?: string | null
          price?: number | null
          quantity?: number | null
          quantity_label?: string | null
          rms_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      llm_reextract_candidates: {
        Row: {
          ambiguity_flags: string[] | null
          category_slug: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          missing_fields: string[] | null
          parse_confidence: number | null
          product_slug: string | null
          reason: string
          run_id: string | null
          status: string
          url: string
        }
        Insert: {
          ambiguity_flags?: string[] | null
          category_slug?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          missing_fields?: string[] | null
          parse_confidence?: number | null
          product_slug?: string | null
          reason: string
          run_id?: string | null
          status?: string
          url: string
        }
        Update: {
          ambiguity_flags?: string[] | null
          category_slug?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          missing_fields?: string[] | null
          parse_confidence?: number | null
          product_slug?: string | null
          reason?: string
          run_id?: string | null
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_reextract_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      phase3_category_summary: {
        Row: {
          category_slug: string
          classification: Database["public"]["Enums"]["phase3_classification"]
          created_at: string
          human_review_required: boolean
          id: string
          include_in_phase3a: boolean
          notes: string | null
          product_count: number
          reason: string
        }
        Insert: {
          category_slug: string
          classification: Database["public"]["Enums"]["phase3_classification"]
          created_at?: string
          human_review_required: boolean
          id?: string
          include_in_phase3a: boolean
          notes?: string | null
          product_count: number
          reason: string
        }
        Update: {
          category_slug?: string
          classification?: Database["public"]["Enums"]["phase3_classification"]
          created_at?: string
          human_review_required?: boolean
          id?: string
          include_in_phase3a?: boolean
          notes?: string | null
          product_count?: number
          reason?: string
        }
        Relationships: []
      }
      phase3_scrape_manifest: {
        Row: {
          category_slug: string | null
          classification: Database["public"]["Enums"]["phase3_classification"]
          classification_reason: string
          created_at: string
          has_base_category_pair: boolean
          id: string
          is_1_suffixed_category: boolean
          is_custom_order_co: boolean
          is_ut_prefixed: boolean
          overlaps_with_base_category: boolean
          product_count_group: number | null
          product_slug: string | null
          recommended_phase: string
          scrape_priority: number
          url: string
        }
        Insert: {
          category_slug?: string | null
          classification: Database["public"]["Enums"]["phase3_classification"]
          classification_reason: string
          created_at?: string
          has_base_category_pair?: boolean
          id?: string
          is_1_suffixed_category?: boolean
          is_custom_order_co?: boolean
          is_ut_prefixed?: boolean
          overlaps_with_base_category?: boolean
          product_count_group?: number | null
          product_slug?: string | null
          recommended_phase: string
          scrape_priority?: number
          url: string
        }
        Update: {
          category_slug?: string | null
          classification?: Database["public"]["Enums"]["phase3_classification"]
          classification_reason?: string
          created_at?: string
          has_base_category_pair?: boolean
          id?: string
          is_1_suffixed_category?: boolean
          is_custom_order_co?: boolean
          is_ut_prefixed?: boolean
          overlaps_with_base_category?: boolean
          product_count_group?: number | null
          product_slug?: string | null
          recommended_phase?: string
          scrape_priority?: number
          url?: string
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
          {
            foreignKeyName: "reconciliation_matches_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_final_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_errors: {
        Row: {
          attempt: number
          created_at: string
          error_message: string | null
          error_type: string
          http_status: number | null
          id: string
          phase: string
          raw: Json | null
          run_id: string | null
          url: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          error_type: string
          http_status?: number | null
          id?: string
          phase: string
          raw?: Json | null
          run_id?: string | null
          url: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          error_type?: string
          http_status?: number | null
          id?: string
          phase?: string
          raw?: Json | null
          run_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_errors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
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
          inferred_filename: string | null
          is_hero: boolean
          position: number
          scraped_product_id: string
          source_page_url: string | null
          visible_filename: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          height?: number | null
          id?: string
          image_url: string
          inferred_filename?: string | null
          is_hero?: boolean
          position?: number
          scraped_product_id: string
          source_page_url?: string | null
          visible_filename?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          height?: number | null
          id?: string
          image_url?: string
          inferred_filename?: string | null
          is_hero?: boolean
          position?: number
          scraped_product_id?: string
          source_page_url?: string | null
          visible_filename?: string | null
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
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_final_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_product_llm_repairs: {
        Row: {
          alt_texts: string[] | null
          category_slug: string | null
          confidence: number | null
          created_at: string
          description: string | null
          dimensions: string | null
          error_message: string | null
          id: string
          image_urls: string[] | null
          inferred_filenames: string[] | null
          model: string | null
          primary_image_url: string | null
          product_slug: string | null
          product_title_normalized: string | null
          product_title_original: string | null
          raw_response: Json | null
          repair_notes: string | null
          repaired_fields: string[] | null
          run_id: string | null
          source_url: string
          status: string
          still_missing_fields: string[] | null
          stocked_quantity: string | null
        }
        Insert: {
          alt_texts?: string[] | null
          category_slug?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          error_message?: string | null
          id?: string
          image_urls?: string[] | null
          inferred_filenames?: string[] | null
          model?: string | null
          primary_image_url?: string | null
          product_slug?: string | null
          product_title_normalized?: string | null
          product_title_original?: string | null
          raw_response?: Json | null
          repair_notes?: string | null
          repaired_fields?: string[] | null
          run_id?: string | null
          source_url: string
          status?: string
          still_missing_fields?: string[] | null
          stocked_quantity?: string | null
        }
        Update: {
          alt_texts?: string[] | null
          category_slug?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          error_message?: string | null
          id?: string
          image_urls?: string[] | null
          inferred_filenames?: string[] | null
          model?: string | null
          primary_image_url?: string | null
          product_slug?: string | null
          product_title_normalized?: string | null
          product_title_original?: string | null
          raw_response?: Json | null
          repair_notes?: string | null
          repaired_fields?: string[] | null
          run_id?: string | null
          source_url?: string
          status?: string
          still_missing_fields?: string[] | null
          stocked_quantity?: string | null
        }
        Relationships: []
      }
      scraped_product_pages_markdown: {
        Row: {
          category_slug: string | null
          credits_used: number | null
          http_status: number | null
          id: string
          links: string[] | null
          markdown: string | null
          metadata: Json | null
          product_slug: string | null
          run_id: string
          scraped_at: string
          url: string
        }
        Insert: {
          category_slug?: string | null
          credits_used?: number | null
          http_status?: number | null
          id?: string
          links?: string[] | null
          markdown?: string | null
          metadata?: Json | null
          product_slug?: string | null
          run_id: string
          scraped_at?: string
          url: string
        }
        Update: {
          category_slug?: string | null
          credits_used?: number | null
          http_status?: number | null
          id?: string
          links?: string[] | null
          markdown?: string | null
          metadata?: Json | null
          product_slug?: string | null
          run_id?: string
          scraped_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_product_pages_markdown_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_product_variants: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          position: number
          raw: Json | null
          scraped_product_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          position?: number
          raw?: Json | null
          scraped_product_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          position?: number
          raw?: Json | null
          scraped_product_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_product_variants_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_product_variants_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_product_variants_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_final_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_products: {
        Row: {
          add_to_cart_present: boolean | null
          ambiguity_flags: string[] | null
          breadcrumb: string[] | null
          category_slug: string | null
          color_notes: string | null
          description: string | null
          dimensions: string | null
          extraction_confidence: number | null
          generic_notes: string | null
          hero_image_url: string | null
          id: string
          inferred_category_label: string | null
          is_custom_order_co: boolean | null
          material_notes: string | null
          missing_fields: string[] | null
          needs_llm_reextract: boolean | null
          next_product_url: string | null
          parse_confidence: number | null
          parse_errors: string[] | null
          phase: string | null
          previous_product_url: string | null
          product_title_normalized: string | null
          product_title_original: string | null
          quantity_selector_present: boolean | null
          raw: Json | null
          reextract_reason: string | null
          related_product_urls: string[] | null
          run_id: string
          scraped_at: string
          size_notes: string | null
          slug: string
          stocked_quantity: string | null
          subcategory_slug: string | null
          title: string
          url: string
          variant_selector_present: boolean | null
          warnings: string[] | null
        }
        Insert: {
          add_to_cart_present?: boolean | null
          ambiguity_flags?: string[] | null
          breadcrumb?: string[] | null
          category_slug?: string | null
          color_notes?: string | null
          description?: string | null
          dimensions?: string | null
          extraction_confidence?: number | null
          generic_notes?: string | null
          hero_image_url?: string | null
          id?: string
          inferred_category_label?: string | null
          is_custom_order_co?: boolean | null
          material_notes?: string | null
          missing_fields?: string[] | null
          needs_llm_reextract?: boolean | null
          next_product_url?: string | null
          parse_confidence?: number | null
          parse_errors?: string[] | null
          phase?: string | null
          previous_product_url?: string | null
          product_title_normalized?: string | null
          product_title_original?: string | null
          quantity_selector_present?: boolean | null
          raw?: Json | null
          reextract_reason?: string | null
          related_product_urls?: string[] | null
          run_id: string
          scraped_at?: string
          size_notes?: string | null
          slug: string
          stocked_quantity?: string | null
          subcategory_slug?: string | null
          title: string
          url: string
          variant_selector_present?: boolean | null
          warnings?: string[] | null
        }
        Update: {
          add_to_cart_present?: boolean | null
          ambiguity_flags?: string[] | null
          breadcrumb?: string[] | null
          category_slug?: string | null
          color_notes?: string | null
          description?: string | null
          dimensions?: string | null
          extraction_confidence?: number | null
          generic_notes?: string | null
          hero_image_url?: string | null
          id?: string
          inferred_category_label?: string | null
          is_custom_order_co?: boolean | null
          material_notes?: string | null
          missing_fields?: string[] | null
          needs_llm_reextract?: boolean | null
          next_product_url?: string | null
          parse_confidence?: number | null
          parse_errors?: string[] | null
          phase?: string | null
          previous_product_url?: string | null
          product_title_normalized?: string | null
          product_title_original?: string | null
          quantity_selector_present?: boolean | null
          raw?: Json | null
          reextract_reason?: string | null
          related_product_urls?: string[] | null
          run_id?: string
          scraped_at?: string
          size_notes?: string | null
          slug?: string
          stocked_quantity?: string | null
          subcategory_slug?: string | null
          title?: string
          url?: string
          variant_selector_present?: boolean | null
          warnings?: string[] | null
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
          canonical_category_candidate: string | null
          category_slug_candidate: string | null
          classification_confidence: number | null
          classification_reason: string | null
          co_flag: boolean | null
          depth: number | null
          discovered_at: string
          first_segment: string | null
          id: string
          is_category_index: boolean | null
          is_likely_legacy: boolean | null
          is_product_detail_candidate: boolean | null
          is_subbrand: boolean | null
          kind: Database["public"]["Enums"]["scraped_url_kind"]
          page_type: string | null
          path: string
          path_depth: number | null
          product_slug_candidate: string | null
          run_id: string
          second_segment: string | null
          url: string
        }
        Insert: {
          canonical_category_candidate?: string | null
          category_slug_candidate?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          co_flag?: boolean | null
          depth?: number | null
          discovered_at?: string
          first_segment?: string | null
          id?: string
          is_category_index?: boolean | null
          is_likely_legacy?: boolean | null
          is_product_detail_candidate?: boolean | null
          is_subbrand?: boolean | null
          kind?: Database["public"]["Enums"]["scraped_url_kind"]
          page_type?: string | null
          path: string
          path_depth?: number | null
          product_slug_candidate?: string | null
          run_id: string
          second_segment?: string | null
          url: string
        }
        Update: {
          canonical_category_candidate?: string | null
          category_slug_candidate?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          co_flag?: boolean | null
          depth?: number | null
          discovered_at?: string
          first_segment?: string | null
          id?: string
          is_category_index?: boolean | null
          is_likely_legacy?: boolean | null
          is_product_detail_candidate?: boolean | null
          is_subbrand?: boolean | null
          kind?: Database["public"]["Enums"]["scraped_url_kind"]
          page_type?: string | null
          path?: string
          path_depth?: number | null
          product_slug_candidate?: string | null
          run_id?: string
          second_segment?: string | null
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
      llm_reextract_candidates_canonical: {
        Row: {
          ambiguity_flags: string[] | null
          category_slug: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          id: string | null
          missing_fields: string[] | null
          parse_confidence: number | null
          product_slug: string | null
          reason: string | null
          rn: number | null
          run_id: string | null
          status: string | null
          url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_reextract_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_product_images_canonical: {
        Row: {
          alt_text: string | null
          height: number | null
          id: string | null
          image_url: string | null
          inferred_filename: string | null
          is_hero: boolean | null
          position: number | null
          scraped_product_id: string | null
          source_page_url: string | null
          visible_filename: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_product_images_scraped_product_id_fkey"
            columns: ["scraped_product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products_final_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_product_images_final_canonical: {
        Row: {
          alt_text: string | null
          id: string | null
          image_source: string | null
          image_url: string | null
          inferred_filename: string | null
          is_hero: boolean | null
          position: number | null
          scraped_product_id: string | null
          source_page_url: string | null
        }
        Relationships: []
      }
      scraped_product_llm_repairs_latest: {
        Row: {
          alt_texts: string[] | null
          category_slug: string | null
          confidence: number | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          error_message: string | null
          id: string | null
          image_urls: string[] | null
          inferred_filenames: string[] | null
          model: string | null
          primary_image_url: string | null
          product_slug: string | null
          product_title_normalized: string | null
          product_title_original: string | null
          raw_response: Json | null
          repair_notes: string | null
          repaired_fields: string[] | null
          rn: number | null
          run_id: string | null
          source_url: string | null
          status: string | null
          still_missing_fields: string[] | null
          stocked_quantity: string | null
        }
        Relationships: []
      }
      scraped_products_canonical: {
        Row: {
          add_to_cart_present: boolean | null
          ambiguity_flags: string[] | null
          breadcrumb: string[] | null
          category_slug: string | null
          color_notes: string | null
          description: string | null
          dimensions: string | null
          extraction_confidence: number | null
          generic_notes: string | null
          hero_image_url: string | null
          id: string | null
          inferred_category_label: string | null
          is_custom_order_co: boolean | null
          material_notes: string | null
          missing_fields: string[] | null
          needs_llm_reextract: boolean | null
          next_product_url: string | null
          parse_confidence: number | null
          parse_errors: string[] | null
          phase: string | null
          previous_product_url: string | null
          product_title_normalized: string | null
          product_title_original: string | null
          quantity_selector_present: boolean | null
          raw: Json | null
          reextract_reason: string | null
          related_product_urls: string[] | null
          rn: number | null
          run_id: string | null
          scraped_at: string | null
          size_notes: string | null
          slug: string | null
          stocked_quantity: string | null
          subcategory_slug: string | null
          title: string | null
          url: string | null
          variant_selector_present: boolean | null
          warnings: string[] | null
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
      scraped_products_final_canonical: {
        Row: {
          add_to_cart_present: boolean | null
          breadcrumb: string[] | null
          category_slug: string | null
          color_notes: string | null
          description: string | null
          dimensions: string | null
          extraction_method: string | null
          final_confidence: number | null
          generic_notes: string | null
          hero_image_url: string | null
          id: string | null
          is_custom_order_co: boolean | null
          markdown_confidence: number | null
          markdown_missing_fields: string[] | null
          material_notes: string | null
          needs_llm_reextract: boolean | null
          next_product_url: string | null
          previous_product_url: string | null
          product_slug: string | null
          product_title_normalized: string | null
          product_title_original: string | null
          quantity_selector_present: boolean | null
          related_product_urls: string[] | null
          repair_confidence: number | null
          repaired_by_llm: boolean | null
          repaired_fields: string[] | null
          run_id: string | null
          scraped_at: string | null
          size_notes: string | null
          still_missing_fields: string[] | null
          stocked_quantity: string | null
          url: string | null
          variant_selector_present: boolean | null
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
      phase3_classification:
        | "scrape_phase3a_main_inventory"
        | "hold_parallel_category_review"
        | "hold_subbrand_review"
        | "exclude_test"
        | "exclude_vanity_or_marketing"
        | "unknown_needs_review"
      scrape_phase:
        | "map"
        | "category_scrape"
        | "product_scrape"
        | "reconcile"
        | "phase3a_markdown"
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
      phase3_classification: [
        "scrape_phase3a_main_inventory",
        "hold_parallel_category_review",
        "hold_subbrand_review",
        "exclude_test",
        "exclude_vanity_or_marketing",
        "unknown_needs_review",
      ],
      scrape_phase: [
        "map",
        "category_scrape",
        "product_scrape",
        "reconcile",
        "phase3a_markdown",
      ],
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
