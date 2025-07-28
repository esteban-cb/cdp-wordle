import { NextResponse } from "next/server";
import { getOrCreateGameState } from "../../services/gameState";

export async function GET() {
  try {
    // Use a default user ID for simplicity
    const userId = "user123";
    const gameState = getOrCreateGameState(userId);

    return NextResponse.json({
      targetWord: gameState.targetWord,
      guesses: gameState.guesses,
      isComplete: gameState.isComplete,
      isWon: gameState.isWon,
    });
  } catch (error) {
    console.error("Error getting game state:", error);
    return NextResponse.json(
      { error: "Failed to get game state" },
      { status: 500 }
    );
  }
}