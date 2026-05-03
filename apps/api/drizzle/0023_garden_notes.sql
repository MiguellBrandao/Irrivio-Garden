CREATE TABLE public.garden_notes (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "garden_id" uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  "company_membership_id" uuid NOT NULL REFERENCES public.company_memberships(id) ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "note" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "garden_notes_garden_id_index" ON public.garden_notes ("garden_id");
CREATE INDEX "garden_notes_company_id_index" ON public.garden_notes ("company_id");
CREATE INDEX "garden_notes_company_membership_id_index" ON public.garden_notes ("company_membership_id");
