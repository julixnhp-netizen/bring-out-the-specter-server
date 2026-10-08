# Bring Out the Specter — servidor

Servidor inicial para probar una sala multijugador real con dos teléfonos.

## Qué hace

- Teléfono A crea una sala y recibe un código.
- Teléfono B introduce el código y entra.
- El servidor mantiene a ambos en la misma sala.
- Cada jugador puede marcarse como listo.
- Cuando hay 2 jugadores y ambos están listos, el servidor envía `game_start`.
- `ping_game` permite probar eventos de juego entre los dos clientes.

## Ejecutar localmente

```bash
npm install
npm start
```

El servidor usará el puerto `3000`.

## Mensajes WebSocket

Crear sala:

```json
{"type":"create_room","name":"Jugador 1"}
```

Entrar:

```json
{"type":"join_room","code":"ABC123","name":"Jugador 2"}
```

Listo:

```json
{"type":"ready","ready":true}
```

Evento de prueba:

```json
{
  "type":"ping_game",
  "event":{"kind":"move","x":10,"y":20}
}
```

## Siguiente prueba

Primero verificamos conexión, creación de sala y entrada del segundo teléfono.
Después conectaremos este servidor con el movimiento, disparos y daño del juego.
