

// Our players "config" - defines icons, colors, name, etc.
const players = [
  {
    id: 1,
    name: "Player 1",
    iconClass: "fa-x",
    colorClass: "turquoise",
  },
  {
    id: 2,
    name: "Player 2",
    iconClass: "fa-o",
    colorClass: "yellow",
  },
];

// MVC pattern
function init() {
  // "Model"
  const store = new Store("game-state-key", players);

  // "View"
  const view = new View();

  // "Controller" logic (event listeners + handlers)

  /**
   * Listen for changes to the game state, re-render view when change occurs.
   *
   * The `statechange` event is a custom Event defined in the Store class
   */
  store.addEventListener("statechange", () => {
    view.render(store.game, store.stats);
  });

  /**
   * When 2 players are playing from different browser tabs, listen for changes
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
   */
  window.addEventListener("storage", () => {
    console.log("State changed from another tab");
    view.render(store.game, store.stats);
  });

  // When the HTML document first loads, render the view based on the current state.
  view.render(store.game, store.stats);

  view.bindGameResetEvent((event) => {
    store.reset();
  });

  view.bindNewRoundEvent((event) => {
    store.newRound();
  });

  view.bindPlayerMoveEvent((square) => {
    const existingMove = store.game.moves.find(
      (move) => move.squareId === +square.id
    );

    if (existingMove) {
      return;
    }

    // Advance to the next state by pushing a move to the moves array
    store.playerMove(+square.id);
  });
}

window.addEventListener("load", init);

class View {
  $ = {};
  $$ = {};

  constructor() {
    /**
     * Pre-select all the elements we'll need (for convenience and clarity)
     */

    // Single elements
    this.$.menu = this.#qs('[data-id="menu"]');
    this.$.menuBtn = this.#qs('[data-id="menu-btn"]');
    this.$.menuItems = this.#qs('[data-id="menu-items"]');
    this.$.resetBtn = this.#qs('[data-id="reset-btn"]');
    this.$.newRoundBtn = this.#qs('[data-id="new-round-btn"]');
    this.$.modal = this.#qs('[data-id="modal"]');
    this.$.modalText = this.#qs('[data-id="modal-text"]');
    this.$.modalBtn = this.#qs('[data-id="modal-btn"]');
    this.$.turn = this.#qs('[data-id="turn"]');
    this.$.p1Wins = this.#qs('[data-id="p1-wins"]');
    this.$.p2Wins = this.#qs('[data-id="p2-wins"]');
    this.$.ties = this.#qs('[data-id="ties"]');
    this.$.grid = this.#qs('[data-id="grid"]');

    // Element lists
    this.$$.squares = this.#qsAll('[data-id="square"]');

    /**
     * UI-only event listeners
     *
     * These are listeners that do not mutate state and therefore
     * can be contained within View entirely.
     */
    this.$.menuBtn.addEventListener("click", (event) => {
      this.#toggleMenu();
    });
  }

  /**
   * This application follows a declarative rendering methodology
   * and will re-render every time the state changes
   *
   * @see https://www.zachgollwitzer.com/posts/imperative-programming#react-declarative-vs-jquery-imperative
   */
  render(game, stats) {
    const { playerWithStats, ties } = stats;
    const {
      moves,
      currentPlayer,
      status: { isComplete, winner },
    } = game;

    this.#closeAll();
    this.#clearMoves();
    this.#updateScoreboard(
      playerWithStats[0].wins,
      playerWithStats[1].wins,
      ties
    );
    this.#initializeMoves(moves);

    if (isComplete) {
      this.#openModal(winner ? `${winner.name} wins!` : "Tie!");
      return;
    }

    this.#setTurnIndicator(currentPlayer);
  }

  /**
   * Events that are handled by the "Controller" in app.js
   * ----------------------------------------------------------
   */

  bindGameResetEvent(handler) {
    this.$.resetBtn.addEventListener("click", handler);
    this.$.modalBtn.addEventListener("click", handler);
  }

  bindNewRoundEvent(handler) {
    this.$.newRoundBtn.addEventListener("click", handler);
  }

  bindPlayerMoveEvent(handler) {
    this.#delegate(this.$.grid, '[data-id="square"]', "click", handler);
  }

  /**
   * All methods below ⬇️ are private utility methods used for updating the UI
   * -----------------------------------------------------------------------------
   */

  #updateScoreboard(p1Wins, p2Wins, ties) {
    this.$.p1Wins.innerText = `${p1Wins} wins`;
    this.$.p2Wins.innerText = `${p2Wins} wins`;
    this.$.ties.innerText = `${ties} ties`;
  }

  #openModal(message) {
    this.$.modal.classList.remove("hidden");
    this.$.modalText.innerText = message;
  }

  #closeAll() {
    this.#closeModal();
    this.#closeMenu();
  }

  #clearMoves() {
    this.$$.squares.forEach((square) => {
      square.replaceChildren();
    });
  }

  #initializeMoves(moves) {
    this.$$.squares.forEach((square) => {
      const existingMove = moves.find((move) => move.squareId === +square.id);

      if (existingMove) {
        this.#handlePlayerMove(square, existingMove.player);
      }
    });
  }

  #closeModal() {
    this.$.modal.classList.add("hidden");
  }

  #closeMenu() {
    this.$.menuItems.classList.add("hidden");
    this.$.menuBtn.classList.remove("border");

    const icon = this.$.menuBtn.querySelector("i");

    icon.classList.add("fa-chevron-down");
    icon.classList.remove("fa-chevron-up");
  }

  #toggleMenu() {
    this.$.menuItems.classList.toggle("hidden");
    this.$.menuBtn.classList.toggle("border");

    const icon = this.$.menuBtn.querySelector("i");

    icon.classList.toggle("fa-chevron-down");
    icon.classList.toggle("fa-chevron-up");
  }

  #handlePlayerMove(squareEl, player) {
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", player.iconClass, player.colorClass);
    squareEl.replaceChildren(icon);
  }

  #setTurnIndicator(player) {
    const icon = document.createElement("i");
    const label = document.createElement("p");

    icon.classList.add("fa-solid", player.colorClass, player.iconClass);

    label.classList.add(player.colorClass);
    label.innerText = `${player.name}, you're up!`;

    this.$.turn.replaceChildren(icon, label);
  }

  /**
   * The #qs and #qsAll methods are "safe selectors", meaning they
   * _guarantee_ the elements we select exist in the DOM (otherwise throw an error)
   */
  #qs(selector, parent) {
    const el = parent
      ? parent.querySelector(selector)
      : document.querySelector(selector);

    if (!el) throw new Error("Could not find element");

    return el;
  }

  #qsAll(selector) {
    const elList = document.querySelectorAll(selector);

    if (!elList) throw new Error("Could not find elements");

    return elList;
  }

  /**
   * Rather than registering event listeners on every child element in our Tic Tac Toe grid, we can
   * listen to the grid container and derive which square was clicked using the matches() function.
   *
   * @param {*} el the "container" element you want to listen for events on
   * @param {*} selector the "child" elements within the "container" you want to handle events for
   * @param {*} eventKey the event type you are listening for (e.g. "click" event)
   * @param {*} handler the callback function that is executed when the specified event is triggered on the specified children
   */
  #delegate(el, selector, eventKey, handler) {
    el.addEventListener(eventKey, (event) => {
      if (event.target.matches(selector)) {
        handler(event.target);
      }
    });
  }
}

const initialState = {
  currentGameMoves: [], // All the player moves for the active game
  history: {
    currentRoundGames: [],
    allGames: [],
  },
};

/**
 * Store is (loosely) the "Model" in the MV* or MVC pattern
 *
 * Think of this as our abstraction on top of an arbitrary data store.
 * In this app, we're using localStorage, but this class should not require
 * much change if we wanted to change our storage location to an in-memory DB,
 * external location, etc. (just change #getState and #saveState methods)
 *
 * This class extends EventTarget so we can emit a `statechange` event when
 * state changes, which the controller can listen for to know when to re-render the view.
 */
export default class Store extends EventTarget {
  constructor(key, players) {
    // Since we're extending EventTarget, need to call super() so we have access to instance methods
    super();

    // Key to use for localStorage state object
    this.storageKey = key;
    this.players = players;
  }

  /** stats() and game() are Convenience "getters"
   *
   * To avoid storing a complex state object that is difficult to mutate, we store a simple one (array of moves)
   * and derive more useful representations of state via these "getters", which can be accessed as properties on
   * the Store instance object.
   *
   * @example
   *
   * ```
   * const store = new Store()
   *
   * // Regular property reference (JS evaluates fn under hood)
   * const game = store.game
   * const stats = store.stats
   * ```
   *
   * @see - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
   */
  get stats() {
    const state = this.#getState();

    return {
      playerWithStats: this.players.map((player) => {
        const wins = state.history.currentRoundGames.filter(
          (game) => game.status.winner?.id === player.id
        ).length;

        return {
          ...player,
          wins,
        };
      }),
      ties: state.history.currentRoundGames.filter(
        (game) => game.status.winner === null
      ).length,
    };
  }

  get game() {
    const state = this.#getState();

    const currentPlayer = this.players[state.currentGameMoves.length % 2];

    const winningPatterns = [
      [1, 2, 3],
      [1, 5, 9],
      [1, 4, 7],
      [2, 5, 8],
      [3, 5, 7],
      [3, 6, 9],
      [4, 5, 6],
      [7, 8, 9],
    ];

    let winner = null;

    for (const player of this.players) {
      const selectedSquareIds = state.currentGameMoves
        .filter((move) => move.player.id === player.id)
        .map((move) => move.squareId);

      for (const pattern of winningPatterns) {
        if (pattern.every((v) => selectedSquareIds.includes(v))) {
          winner = player;
        }
      }
    }

    return {
      moves: state.currentGameMoves,
      currentPlayer,
      status: {
        isComplete: winner != null || state.currentGameMoves.length === 9,
        winner,
      },
    };
  }

  playerMove(squareId) {
    /**
     * Never mutate state directly.  Create copy of state, edit the copy,
     * and save copy as new version of state.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
     * @see https://redux.js.org/style-guide/#do-not-mutate-state
     */
    const stateClone = structuredClone(this.#getState());

    stateClone.currentGameMoves.push({
      squareId,
      player: this.game.currentPlayer,
    });

    this.#saveState(stateClone);
  }

  /**
   * Resets the game.
   *
   * If the current game is complete, the game is archived.
   * If the current game is NOT complete, it is deleted.
   */
  reset() {
    const stateClone = structuredClone(this.#getState());

    const { status, moves } = this.game;

    if (status.isComplete) {
      stateClone.history.currentRoundGames.push({
        moves,
        status,
      });
    }

    stateClone.currentGameMoves = [];

    this.#saveState(stateClone);
  }

  /**
   * Resets the scoreboard (wins, losses, and ties)
   */
  newRound() {
    this.reset();

    const stateClone = structuredClone(this.#getState());
    stateClone.history.allGames.push(...stateClone.history.currentRoundGames);
    stateClone.history.currentRoundGames = [];

    this.#saveState(stateClone);
  }

  /**
   * Private state reducer that transitions from the old state to the new state
   * and saves it to localStorage.  Every time state changes, a custom 'statechange'
   * event is emitted.
   *
   * @param {*} stateOrFn can be an object or callback fn
   *
   * We are not using Redux here, but it gives a good overview of some essential concepts to managing state:
   * @see https://redux.js.org/understanding/thinking-in-redux/three-principles#changes-are-made-with-pure-functions
   */
  #saveState(stateOrFn) {
    const prevState = this.#getState();

    let newState;

    switch (typeof stateOrFn) {
      case "function":
        newState = stateOrFn(prevState);
        break;
      case "object":
        newState = stateOrFn;
        break;
      default:
        throw new Error("Invalid argument passed to saveState");
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(newState));
    this.dispatchEvent(new Event("statechange"));
  }

  #getState() {
    const item = window.localStorage.getItem(this.storageKey);
    return item ? JSON.parse(item) : initialState;
  }
}
