/**
 * Kanban Visual Workflow Management System
 * Visual board for tracking production workflow
 */

import { WindowUnit } from '@/types/fabricator';

export interface KanbanCard {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: KanbanColumn['id'];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface KanbanColumn {
  id: string;
  name: string;
  limit?: number; // WIP limit
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  createdAt: Date;
  updatedAt: Date;
}

export class KanbanSystem {
  private boards: Map<string, KanbanBoard> = new Map();

  /**
   * Create kanban board
   */
  createBoard(name: string, boardId?: string): KanbanBoard {
    const board: KanbanBoard = {
      id: boardId || `board_${Date.now()}`,
      name,
      columns: [
        { id: 'backlog', name: 'Backlog', cards: [] },
        { id: 'design', name: 'Design', cards: [], limit: 5 },
        { id: 'production', name: 'Production', cards: [], limit: 3 },
        { id: 'quality', name: 'Quality Control', cards: [], limit: 2 },
        { id: 'delivery', name: 'Ready for Delivery', cards: [] },
        { id: 'completed', name: 'Completed', cards: [] },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.boards.set(board.id, board);
    return board;
  }

  /**
   * Add card to board
   */
  addCard(boardId: string, card: KanbanCard): void {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);

    const column = board.columns.find((c) => c.id === card.status);
    if (!column) throw new Error(`Column ${card.status} not found`);

    // Check WIP limit
    if (column.limit && column.cards.length >= column.limit) {
      throw new Error(`Column ${column.name} has reached WIP limit`);
    }

    column.cards.push(card);
    board.updatedAt = new Date();
  }

  /**
   * Move card between columns
   */
  moveCard(
    boardId: string,
    cardId: string,
    targetColumnId: string
  ): void {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);

    let card: KanbanCard | undefined;
    let sourceColumn: KanbanColumn | undefined;

    // Find card and remove from source column
    for (const column of board.columns) {
      const index = column.cards.findIndex((c) => c.id === cardId);
      if (index !== -1) {
        card = column.cards[index];
        column.cards.splice(index, 1);
        sourceColumn = column;
        break;
      }
    }

    if (!card) throw new Error(`Card ${cardId} not found`);

    // Check target column WIP limit
    const targetColumn = board.columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) throw new Error(`Column ${targetColumnId} not found`);

    if (targetColumn.limit && targetColumn.cards.length >= targetColumn.limit) {
      // Revert card to source column
      sourceColumn?.cards.push(card);
      throw new Error(`Column ${targetColumn.name} has reached WIP limit`);
    }

    // Add to target column
    card.status = targetColumnId;
    targetColumn.cards.push(card);
    board.updatedAt = new Date();
  }

  /**
   * Get board
   */
  getBoard(boardId: string): KanbanBoard | undefined {
    return this.boards.get(boardId);
  }

  /**
   * Get all boards
   */
  getAllBoards(): KanbanBoard[] {
    return Array.from(this.boards.values());
  }

  /**
   * Create card from project
   */
  createCardFromProject(project: WindowUnit): KanbanCard {
    const priorityMap: Record<WindowUnit['status'], KanbanCard['priority']> = {
      design: 'medium',
      optimized: 'high',
      production: 'high',
      completed: 'low',
    };

    const statusMap: Record<WindowUnit['status'], KanbanColumn['id']> = {
      design: 'design',
      optimized: 'production',
      production: 'production',
      completed: 'completed',
    };

    return {
      id: `card_${project.id}`,
      projectId: project.id,
      title: `${project.orderNumber} - ${project.type}`,
      description: `${project.overallWidth}x${project.overallHeight}mm ${project.color}`,
      status: statusMap[project.status] || 'backlog',
      priority: priorityMap[project.status] || 'medium',
      dueDate: project.updatedAt,
      tags: [project.type, project.color],
      metadata: {
        project,
      },
    };
  }

  /**
   * Get board statistics
   */
  getBoardStatistics(boardId: string): {
    totalCards: number;
    cardsByColumn: Record<string, number>;
    averageCycleTime: number; // days
    wipUtilization: Record<string, number>; // percentage of WIP limit used
  } {
    const board = this.boards.get(boardId);
    if (!board) {
      return {
        totalCards: 0,
        cardsByColumn: {},
        averageCycleTime: 0,
        wipUtilization: {},
      };
    }

    const cardsByColumn: Record<string, number> = {};
    const wipUtilization: Record<string, number> = {};

    for (const column of board.columns) {
      cardsByColumn[column.id] = column.cards.length;
      if (column.limit) {
        wipUtilization[column.id] = (column.cards.length / column.limit) * 100;
      }
    }

    // Calculate average cycle time (simplified)
    const completedCards = board.columns
      .find((c) => c.id === 'completed')
      ?.cards || [];
    const averageCycleTime =
      completedCards.length > 0
        ? completedCards.reduce((sum, card) => {
            const cycleTime = card.dueDate
              ? (new Date().getTime() - card.dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
              : 0;
            return sum + cycleTime;
          }, 0) / completedCards.length
        : 0;

    return {
      totalCards: board.columns.reduce(
        (sum, col) => sum + col.cards.length,
        0
      ),
      cardsByColumn,
      averageCycleTime,
      wipUtilization,
    };
  }
}

