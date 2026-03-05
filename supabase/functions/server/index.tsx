import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as gameLogic from "./game-logic.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client for broadcasting
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper to broadcast game state updates via WebSocket
async function broadcastGameUpdate(roomCode: string, gameState: any) {
  try {
    // Note: In Supabase Realtime Broadcast, we don't need to subscribe on server
    // The server can send broadcasts to channels that clients are subscribed to
    await supabase.channel(`room:${roomCode}`).send({
      type: 'broadcast',
      event: 'game_update',
      payload: { gameState },
    });
    console.log(`📡 Broadcasted game_update to room:${roomCode}`);
  } catch (error) {
    console.error('Error broadcasting game update:', error);
  }
}

// Helper to broadcast hand updates
async function broadcastHandUpdate(roomCode: string, playerId: string, hand: any[]) {
  try {
    await supabase.channel(`room:${roomCode}`).send({
      type: 'broadcast',
      event: 'hand_update',
      payload: { playerId, hand },
    });
    console.log(`📡 Broadcasted hand_update to ${playerId} in room:${roomCode}`);
  } catch (error) {
    console.error('Error broadcasting hand update:', error);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-2c8fcbf3/health", (c) => {
  return c.json({ status: "ok" });
});

// Create a new room
app.post("/make-server-2c8fcbf3/rooms/create", async (c) => {
  try {
    const { roomCode, hostId, hostName, maxPlayers, botSlots, isPrivate } = await c.req.json();
    
    const players = [{
      id: hostId,
      name: hostName,
      isBot: false,
      isHost: true,
      cardCount: 0,
      isActive: true,
      lastSeen: Date.now(),
    }];
    
    // Add bot players for enabled bot slots
    botSlots.forEach((isBot: boolean, index: number) => {
      if (isBot) {
        players.push({
          id: `bot-${roomCode}-${index}`,
          name: `Bot ${index + 1}`,
          isBot: true,
          isHost: false,
          cardCount: 0,
          isActive: true,
          lastSeen: Date.now(),
        });
      }
    });
    
    const gameState = {
      roomCode,
      players,
      hands: {},
      pile: [],
      activeRank: null,
      currentTurn: '',
      roundStartedBy: '',
      passCount: 0,
      lastPlay: null,
      gamePhase: 'waiting',
      votes: {},
      inactivePlayerId: null,
      maxPlayers,
      winnerId: null,
      bluffCallerId: null,
      bluffResult: null,
      config: { maxPlayers, botSlots, isPrivate },
    };
    
    await kv.set(`room:${roomCode}`, gameState);
    await kv.set(`room:${roomCode}:active`, true);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error creating room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Join a room
app.post("/make-server-2c8fcbf3/rooms/join", async (c) => {
  try {
    const { roomCode, playerId, playerName } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Check if room is full
    const humanPlayers = gameState.players.filter((p: any) => !p.isBot);
    const botCount = gameState.config.botSlots.filter((b: boolean) => b).length;
    const maxHumanPlayers = gameState.config.maxPlayers - botCount;
    
    if (humanPlayers.length >= maxHumanPlayers) {
      return c.json({ error: 'Room is full' }, 400);
    }
    
    // Add player
    gameState.players.push({
      id: playerId,
      name: playerName,
      isBot: false,
      isHost: false,
      cardCount: 0,
      isActive: true,
      lastSeen: Date.now(),
    });
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error joining room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// OPTIMIZED: Get room state + player hand in ONE call
app.get("/make-server-2c8fcbf3/rooms/:roomCode/state/:playerId", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const playerId = c.req.param('playerId');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const hand = gameState.hands[playerId] || [];
    
    // Return combined data in one response
    return c.json({ gameState, hand });
  } catch (error: any) {
    console.error('Error getting room state:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get room state (legacy endpoint)
app.get("/make-server-2c8fcbf3/rooms/:roomCode", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    return c.json({ gameState });
  } catch (error: any) {
    console.error('Error getting room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get player's hand (legacy endpoint)
app.get("/make-server-2c8fcbf3/rooms/:roomCode/hand/:playerId", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const playerId = c.req.param('playerId');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const hand = gameState.hands[playerId] || [];
    return c.json({ hand });
  } catch (error: any) {
    console.error('Error getting hand:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Start game
app.post("/make-server-2c8fcbf3/rooms/:roomCode/start", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Create and shuffle deck
    const deckCount = gameState.maxPlayers >= 6 ? 2 : 1;
    let deck = gameLogic.createDeck(deckCount);
    deck = gameLogic.shuffleDeck(deck);
    
    // Deal cards
    const playerIds = gameState.players.map((p: any) => p.id);
    gameState.hands = gameLogic.dealCards(deck, playerIds);
    
    // Update card counts
    gameState.players.forEach((player: any) => {
      player.cardCount = gameState.hands[player.id]?.length || 0;
    });
    
    // Set first player
    gameState.currentTurn = playerIds[0];
    gameState.roundStartedBy = playerIds[0];
    gameState.gamePhase = 'playing';
    gameState.pile = [];
    gameState.activeRank = null;
    gameState.passCount = 0;
    gameState.lastPlay = null;
    
    await kv.set(`room:${roomCode}`, gameState);
    
    // 🔥 Broadcast to all players via WebSocket
    await broadcastGameUpdate(roomCode, gameState);
    for (const playerId of playerIds) {
      await broadcastHandUpdate(roomCode, playerId, gameState.hands[playerId]);
    }
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error starting game:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Play cards
app.post("/make-server-2c8fcbf3/rooms/:roomCode/play", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { playerId, cardIds, declaredRank } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const hand = gameState.hands[playerId] || [];
    const playedCards = hand.filter((card: any) => cardIds.includes(card.id));
    
    // Remove cards from hand
    gameState.hands[playerId] = hand.filter((card: any) => !cardIds.includes(card.id));
    
    // Add to pile
    gameState.pile.push(...playedCards);
    
    // Update game state
    if (!gameState.activeRank) {
      gameState.activeRank = declaredRank;
      gameState.roundStartedBy = playerId;
    }
    
    const player = gameState.players.find((p: any) => p.id === playerId);
    gameState.lastPlay = {
      playerId,
      playerName: player?.name || 'Unknown',
      cardCount: playedCards.length,
      declaredRank,
      actualCards: playedCards,
    };
    
    gameState.passCount = 0;
    
    // Update card count
    const playerObj = gameState.players.find((p: any) => p.id === playerId);
    if (playerObj) {
      playerObj.cardCount = gameState.hands[playerId].length;
      
      // Check for winner
      if (playerObj.cardCount === 0) {
        gameState.gamePhase = 'game_over';
        gameState.winnerId = playerId;
        await kv.set(`room:${roomCode}`, gameState);
        await broadcastGameUpdate(roomCode, gameState);
        return c.json({ success: true, gameState });
      }
    }
    
    // Move to next player
    gameState.currentTurn = gameLogic.getNextPlayer(playerId, gameState.players);
    
    await kv.set(`room:${roomCode}`, gameState);
    
    // 🔥 Broadcast updates
    await broadcastGameUpdate(roomCode, gameState);
    await broadcastHandUpdate(roomCode, playerId, gameState.hands[playerId]);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error playing cards:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Call bluff
app.post("/make-server-2c8fcbf3/rooms/:roomCode/bluff", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { callerId } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    if (!gameState.lastPlay) {
      return c.json({ error: 'No cards to call bluff on' }, 400);
    }
    
    const { actualCards, declaredRank, playerId: liarId } = gameState.lastPlay;
    
    // Check if all cards match declared rank
    const wasBluffing = !actualCards.every((card: any) => card.rank === declaredRank);
    const loserPlayerId = wasBluffing ? liarId : callerId;
    
    gameState.bluffCallerId = callerId;
    gameState.bluffResult = {
      wasBluffing,
      loserPlayerId,
      cards: actualCards,
    };
    gameState.gamePhase = 'bluff_reveal';
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error calling bluff:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Resolve bluff
app.post("/make-server-2c8fcbf3/rooms/:roomCode/resolve-bluff", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState || !gameState.bluffResult) {
      return c.json({ error: 'No bluff to resolve' }, 400);
    }
    
    const { loserPlayerId, wasBluffing } = gameState.bluffResult;
    const callerId = gameState.bluffCallerId;
    const liarId = gameState.lastPlay?.playerId;
    
    // Loser picks up the pile
    gameState.hands[loserPlayerId] = [
      ...(gameState.hands[loserPlayerId] || []),
      ...gameState.pile,
    ];
    
    // Update card count
    const loserPlayer = gameState.players.find((p: any) => p.id === loserPlayerId);
    if (loserPlayer) {
      loserPlayer.cardCount = gameState.hands[loserPlayerId].length;
    }
    
    // Winner of the bluff resolution starts the next round
    const winnerPlayerId = wasBluffing ? callerId : liarId;
    
    // Reset for new round
    gameState.pile = [];
    gameState.activeRank = null;
    gameState.lastPlay = null;
    gameState.passCount = 0;
    gameState.currentTurn = winnerPlayerId;
    gameState.roundStartedBy = winnerPlayerId;
    gameState.gamePhase = 'playing';
    gameState.bluffCallerId = null;
    gameState.bluffResult = null;
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error resolving bluff:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Pass turn
app.post("/make-server-2c8fcbf3/rooms/:roomCode/pass", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { playerId } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    gameState.passCount++;
    
    // If all players except round starter passed, round starter wins
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    if (gameState.passCount >= activePlayers.length - 1) {
      // Round starter wins, start new round
      gameState.pile = [];
      gameState.activeRank = null;
      gameState.lastPlay = null;
      gameState.passCount = 0;
      gameState.currentTurn = gameState.roundStartedBy;
      gameState.gamePhase = 'round_end';
      
      await kv.set(`room:${roomCode}`, gameState);
      
      return c.json({ success: true, gameState });
    }
    
    // Move to next player
    gameState.currentTurn = gameLogic.getNextPlayer(playerId, gameState.players);
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Error passing turn:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bot turn
app.post("/make-server-2c8fcbf3/rooms/:roomCode/bot-turn", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { botId } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Decide if bot should call bluff
    if (gameState.lastPlay && gameState.lastPlay.playerId !== botId) {
      const shouldCall = gameLogic.shouldCallBluff(gameState, botId);
      if (shouldCall) {
        // Bot calls bluff
        const { actualCards, declaredRank, playerId: liarId } = gameState.lastPlay;
        const wasBluffing = !actualCards.every((card: any) => card.rank === declaredRank);
        const loserPlayerId = wasBluffing ? liarId : botId;
        
        gameState.bluffCallerId = botId;
        gameState.bluffResult = {
          wasBluffing,
          loserPlayerId,
          cards: actualCards,
        };
        gameState.gamePhase = 'bluff_reveal';
        
        await kv.set(`room:${roomCode}`, gameState);
        return c.json({ success: true, gameState, action: 'bluff' });
      }
    }
    
    // Bot decides to play or pass
    const botHand = gameState.hands[botId] || [];
    const shouldPass = botHand.length <= 2 && gameState.activeRank && Math.random() > 0.6;
    
    if (shouldPass && gameState.roundStartedBy !== botId) {
      // Bot passes
      gameState.passCount++;
      const activePlayers = gameState.players.filter((p: any) => p.isActive);
      
      if (gameState.passCount >= activePlayers.length - 1) {
        gameState.pile = [];
        gameState.activeRank = null;
        gameState.lastPlay = null;
        gameState.passCount = 0;
        gameState.currentTurn = gameState.roundStartedBy;
        gameState.gamePhase = 'round_end';
      } else {
        gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
      }
      
      await kv.set(`room:${roomCode}`, gameState);
      return c.json({ success: true, gameState, action: 'pass' });
    }
    
    // Bot plays cards
    const { cardIds, declaredRank } = gameLogic.chooseBotPlay(gameState, botId);
    
    if (cardIds.length === 0) {
      // Bot has no cards or can't play, pass
      gameState.passCount++;
      gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
      await kv.set(`room:${roomCode}`, gameState);
      return c.json({ success: true, gameState, action: 'pass' });
    }
    
    const hand = gameState.hands[botId] || [];
    const playedCards = hand.filter((card: any) => cardIds.includes(card.id));
    
    gameState.hands[botId] = hand.filter((card: any) => !cardIds.includes(card.id));
    gameState.pile.push(...playedCards);
    
    if (!gameState.activeRank) {
      gameState.activeRank = declaredRank;
      gameState.roundStartedBy = botId;
    }
    
    const bot = gameState.players.find((p: any) => p.id === botId);
    gameState.lastPlay = {
      playerId: botId,
      playerName: bot?.name || 'Bot',
      cardCount: playedCards.length,
      declaredRank,
      actualCards: playedCards,
    };
    
    gameState.passCount = 0;
    
    if (bot) {
      bot.cardCount = gameState.hands[botId].length;
      
      if (bot.cardCount === 0) {
        gameState.gamePhase = 'game_over';
        gameState.winnerId = botId;
        await kv.set(`room:${roomCode}`, gameState);
        return c.json({ success: true, gameState, action: 'play' });
      }
    }
    
    gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true, gameState, action: 'play' });
  } catch (error: any) {
    console.error('Error in bot turn:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update player activity
app.post("/make-server-2c8fcbf3/rooms/:roomCode/heartbeat", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { playerId } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const player = gameState.players.find((p: any) => p.id === playerId);
    if (player) {
      player.lastSeen = Date.now();
    }
    
    // Auto-transition round_end back to playing
    if (gameState.gamePhase === 'round_end') {
      gameState.gamePhase = 'playing';
    }
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating heartbeat:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);