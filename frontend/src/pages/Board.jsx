import KanbanBoard from '../components/board/KanbanBoard.jsx'

/**
 * Board page: thin shell around `KanbanBoard`. Loading/error states for
 * columns and applications live inside `KanbanBoard` itself (it owns
 * `useColumns`/`useApplications`) rather than being duplicated here — see
 * `KanbanBoard.jsx`'s top-level comment for why.
 */
function Board() {
  return (
    <main className="min-h-screen px-6 py-6">
      <KanbanBoard />
    </main>
  )
}

export default Board
