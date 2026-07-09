CREATE TABLE public.prescription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name text NOT NULL DEFAULT '',
  patient_age text NOT NULL DEFAULT '',
  patient_gender text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '',
  dose text NOT NULL DEFAULT '',
  quantity text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.prescription_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.prescription_requests TO authenticated;
GRANT ALL ON public.prescription_requests TO service_role;

ALTER TABLE public.prescription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a request"
  ON public.prescription_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read requests"
  ON public.prescription_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update requests"
  ON public.prescription_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete requests"
  ON public.prescription_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prescription_requests_updated_at
  BEFORE UPDATE ON public.prescription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();