-- Adiciona restrições de validação para Latitude e Longitude na tabela profiles
-- Garante que as coordenadas estejam dentro de faixas reais e não sejam (0,0)

-- Primeiro, limpa valores inválidos existentes para evitar erro ao criar a constraint
UPDATE public.profiles
SET latitude = NULL, longitude = NULL
WHERE (latitude = 0 AND longitude = 0)
   OR (latitude < -90 OR latitude > 90)
   OR (longitude < -180 OR longitude > 180);

-- Adiciona a constraint de check
ALTER TABLE public.profiles 
ADD CONSTRAINT check_valid_coordinates 
CHECK (
  (latitude IS NULL AND longitude IS NULL) OR 
  (
    latitude BETWEEN -90 AND 90 AND 
    longitude BETWEEN -180 AND 180 AND
    (latitude != 0 OR longitude != 0)
  )
);

-- Comentário para documentar
COMMENT ON CONSTRAINT check_valid_coordinates ON public.profiles IS 'Garante que as coordenadas GPS sejam válidas ou nulas, impedindo o ponto 0,0 ou valores fora de faixa.';

-- Garantir que a VIEW profiles_public reflita os dados corretamente
-- (Assumindo que a view já existe e apenas puxa da profiles)
GRANT SELECT ON public.profiles TO authenticated, anon;
