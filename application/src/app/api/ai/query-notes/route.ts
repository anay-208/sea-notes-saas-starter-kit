import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth/auth';
import { DigitalOceanInferenceService } from '../../../../services/ai/digitalOceanInferenceService';
import { createDatabaseService } from '../../../../services/database/databaseFactory';
import { hasAIConfiguredServer } from '../../../../settings';
import { HTTP_STATUS } from '../../../../lib/api/http';

/**
 * AI Query Notes API Endpoint
 * 
 * This API endpoint allows users to ask natural language questions about their notes.
 * It fetches all user notes and provides them as context to the AI for answering.
 * 
 * Features:
 * - User authentication validation
 * - AI service availability checking  
 * - Privacy: only includes the user's own notes
 * - Natural language query processing
 * 
 * Request:
 * - Method: POST
 * - Body: { query: string }
 * - Requires: Valid authentication session
 * 
 * Response:
 * - Success: { answer: string, sources: Array<{ noteId, title, content }> }
 * - Error: { error: string }
 * 
 * @description POST /api/ai/query-notes
 */
export async function POST(request: NextRequest) {
  try {
    // Check if AI is configured
    if (!hasAIConfiguredServer) {
      return NextResponse.json(
        { error: 'AI query service is not configured' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = session.user.id;

    // Validate request body
    let payload: { query?: string };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { query } = payload || {};
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    try {
      // Fetch all user's notes
      const dbClient = await createDatabaseService();
      const userNotes = await dbClient.note.findByUserId(userId);

      if (!userNotes || userNotes.length === 0) {
        return NextResponse.json({
          answer: "You don't have any notes yet. Create some notes first to ask questions about them.",
          sources: []
        });
      }

      // Build context from all notes
      const notesContext = userNotes
        .map(note => `Note "${note.title}" (ID: ${note.id}):\n${note.content}`)
        .join('\n\n---\n\n');

      // Generate response using AI service
      const service = new DigitalOceanInferenceService();
      const answer = await service.answerWithContext(query, notesContext);

      // Prepare sources for response
      const sources = userNotes.map(note => ({
        noteId: note.id,
        title: note.title,
        content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '')
      }));

      return NextResponse.json({
        answer,
        sources
      });

    } catch (error) {
      console.error('Notes query failed:', error);
      return NextResponse.json(
        { error: 'Failed to process query. Please try again.' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  } catch (error) {
    console.error('Unexpected error in query-notes endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
