-- El celular que deja entrar a una computadora queda emparejado con ella (decisión 58): la
-- aprobación del código anota desde qué sesión de celular se hizo, para crear el
-- emparejamiento (un `puesto`) cuando la computadora retira su sesión.
ALTER TABLE vinculacion ADD COLUMN celular_sesion_id uuid REFERENCES sesion(id);
CREATE INDEX puesto_por_celular ON puesto (celular_sesion_id);
