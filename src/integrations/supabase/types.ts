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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          college_id: string | null
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          section_id: string | null
          status: string
          student_id: string | null
          subject: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          marked_by?: string | null
          section_id?: string | null
          status: string
          student_id?: string | null
          subject: string
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          section_id?: string | null
          status?: string
          student_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_problems: {
        Row: {
          college_id: string | null
          constraints: string | null
          created_at: string | null
          created_by: string | null
          description: string
          difficulty: string | null
          id: string
          is_placement: boolean | null
          tags: string[] | null
          test_cases: Json | null
          title: string
        }
        Insert: {
          college_id?: string | null
          constraints?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          difficulty?: string | null
          id?: string
          is_placement?: boolean | null
          tags?: string[] | null
          test_cases?: Json | null
          title: string
        }
        Update: {
          college_id?: string | null
          constraints?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          difficulty?: string | null
          id?: string
          is_placement?: boolean | null
          tags?: string[] | null
          test_cases?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_problems_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_submissions: {
        Row: {
          code: string
          execution_time: number | null
          id: string
          language: string
          memory_used: number | null
          problem_id: string | null
          status: string | null
          submitted_at: string | null
          test_cases_passed: number | null
          total_test_cases: number | null
          user_id: string | null
        }
        Insert: {
          code: string
          execution_time?: number | null
          id?: string
          language: string
          memory_used?: number | null
          problem_id?: string | null
          status?: string | null
          submitted_at?: string | null
          test_cases_passed?: number | null
          total_test_cases?: number | null
          user_id?: string | null
        }
        Update: {
          code?: string
          execution_time?: number | null
          id?: string
          language?: string
          memory_used?: number | null
          problem_id?: string | null
          status?: string | null
          submitted_at?: string | null
          test_cases_passed?: number | null
          total_test_cases?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coding_submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "coding_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string | null
          id: string
          name: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string | null
          id?: string
          name: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          college_id: string | null
          created_at: string | null
          hod_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          college_id?: string | null
          created_at?: string | null
          hod_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          college_id?: string | null
          created_at?: string | null
          hod_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_sections: {
        Row: {
          created_at: string | null
          faculty_id: string
          id: string
          section_id: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          faculty_id: string
          id?: string
          section_id: string
          subject: string
        }
        Update: {
          created_at?: string | null
          faculty_id?: string
          id?: string
          section_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          college_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          title: string
          type: string | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          title: string
          type?: string | null
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_sessions: {
        Row: {
          college_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          session_type: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          session_type?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          session_type?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_sessions_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          college_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          roll_number: string | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          roll_number?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          roll_number?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          id: string
          quiz_id: string | null
          score: number | null
          submitted_at: string | null
          total_marks: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          submitted_at?: string | null
          total_marks?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          submitted_at?: string | null
          total_marks?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          marks: number | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          quiz_id: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          marks?: number | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          marks?: number | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          college_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number
          end_time: string | null
          id: string
          is_active: boolean | null
          start_time: string | null
          subject: string | null
          title: string
          total_marks: number
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          subject?: string | null
          title: string
          total_marks?: number
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          subject?: string | null
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_analytics: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          ats_score: number | null
          file_url: string | null
          generated_at: string | null
          id: string
          metadata: Json | null
          resume_type: string
          target_role: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          resume_type: string
          target_role?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          resume_type?: string
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          college_id: string | null
          created_at: string | null
          department_id: string | null
          id: string
          name: string
          semester: number
          updated_at: string | null
          year: number
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          name: string
          semester: number
          updated_at?: string | null
          year: number
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          name?: string
          semester?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_date: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          issuing_body: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          issuing_body?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          issuing_body?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_certifications: {
        Row: {
          certification_name: string
          created_at: string | null
          credential_url: string | null
          date_issued: string | null
          display_order: number | null
          id: string
          issuing_organization: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certification_name: string
          created_at?: string | null
          credential_url?: string | null
          date_issued?: string | null
          display_order?: number | null
          id?: string
          issuing_organization: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certification_name?: string
          created_at?: string | null
          credential_url?: string | null
          date_issued?: string | null
          display_order?: number | null
          id?: string
          issuing_organization?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_education: {
        Row: {
          cgpa_percentage: string | null
          created_at: string | null
          degree: string
          display_order: number | null
          end_date: string | null
          field_of_study: string | null
          id: string
          institution_name: string
          is_current: boolean | null
          relevant_coursework: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cgpa_percentage?: string | null
          created_at?: string | null
          degree: string
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution_name: string
          is_current?: boolean | null
          relevant_coursework?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cgpa_percentage?: string | null
          created_at?: string | null
          degree?: string
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution_name?: string
          is_current?: boolean | null
          relevant_coursework?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_extracurricular: {
        Row: {
          activity_organization: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_end: string | null
          duration_start: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_organization: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_end?: string | null
          duration_start?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_organization?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_end?: string | null
          duration_start?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          address_city: string | null
          created_at: string | null
          email: string | null
          father_name: string | null
          father_number: string | null
          full_name: string | null
          github_portfolio: string | null
          id: string
          linkedin_profile: string | null
          phone_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_city?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          father_number?: string | null
          full_name?: string | null
          github_portfolio?: string | null
          id?: string
          linkedin_profile?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_city?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          father_number?: string | null
          full_name?: string | null
          github_portfolio?: string | null
          id?: string
          linkedin_profile?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_projects: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_end: string | null
          duration_start: string | null
          github_demo_link: string | null
          id: string
          project_title: string
          role_contribution: string | null
          technologies_used: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_end?: string | null
          duration_start?: string | null
          github_demo_link?: string | null
          id?: string
          project_title: string
          role_contribution?: string | null
          technologies_used?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_end?: string | null
          duration_start?: string | null
          github_demo_link?: string | null
          id?: string
          project_title?: string
          role_contribution?: string | null
          technologies_used?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_skills: {
        Row: {
          category: string
          created_at: string | null
          id: string
          skills: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          skills: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          skills?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          college_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      quiz_questions_student: {
        Row: {
          created_at: string | null
          id: string | null
          marks: number | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          marks?: number | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          marks?: number | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
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
      app_role: "super_admin" | "admin" | "faculty" | "student"
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
      app_role: ["super_admin", "admin", "faculty", "student"],
    },
  },
} as const
