import React, {useEffect, useState, useCallback} from "react";
import './Machine.css';
import _ from 'lodash'; // For debouncing.

function Machine(props) {
  class TrieNode {
    constructor() {
      this.children = {};
      this.endOfWord = false;
    }
  }
  
  class Trie {
    constructor() {
      this.root = new TrieNode();
    }
  
    insert(word) {
      let current = this.root;
      for (let i = 0; i < word.length; i++) {
        let ch = word.charAt(i);
        let node = current.children[ch];
        if (node == null) {
          node = new TrieNode();
          current.children[ch] = node;
        }
        current = node;
      }
      current.endOfWord = true;
    }
  
    searchPrefix(word) {
      let node = this.get(word);
      if (node == null) {
        return false;
      }
      return true;
    }
  
    get(word) {
      let node = this.root;
      for (let i = 0; i < word.length; i++) {
        node = node.children[word.charAt(i)];
        if (node == null) {
          return null;
        }
      }
      return node;
    }

    getWordsWithPrefix(prefix, limit = 200) {
      const node = this.get(prefix);
      if (node == null) {
        return [];
      }
  
      // We'll use DFS to find all words that start with the given prefix.
      const words = [];
      const stack = [[node, prefix]];
      while (stack.length > 0 && words.length < limit) {
        const [node, word] = stack.pop();
  
        if (node.endOfWord) {
          words.push(word);
        }
  
        for (const ch in node.children) {
          stack.push([node.children[ch], word + ch]);
        }
      }
  
      return words;
    }
  }  

  // Search bar 1 state.
  const [search1, setSearch1] = useState("");
  const [suggestions1, setSuggestions1] = useState([]);
  const [matches1, setMatches1] = useState(0);

  // Search bar 2 state.
  const [search2, setSearch2] = useState("");
  const [suggestions2, setSuggestions2] = useState([]);
  const [matches2, setMatches2] = useState(0);

  const [playerPool, setPlayerPool] = useState([]);
  const [trie, setTrie] = useState(null);
  const [linkDict, setLinkDict] = useState({})

  useEffect(() => {
    fetch("http://localhost:5000/get_pool", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    }).then((response) => response.json()).then((data) => {
      // console.log(data); // The player pool (all 53k+).
      setPlayerPool(data);
      const trie = new Trie();
      data.forEach((item) => trie.insert(item));
      setTrie(trie);
    })

    fetch("http://localhost:5000/get_links", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    }).then((response) => response.json()).then((data) => {
      // console.log(data); Print the dict. 
      setLinkDict(data);
    })
  }, [])

  const [results, setResults] = useState([]);
  
  function getConnection() {
    console.log(suggestions1, suggestions2)
    setIsLoading(true); // Start loading.
    fetch("http://localhost:5000/get_connection", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player_1: suggestions1[0],
          player_2: suggestions2[0]
        })
    }).then((response) => response.json()).then((data) => {
      setResults(data);
      setIsLoading(false); // End loading.
    })
  }

  const [buttonVisible, setButtonVisible] = useState(false);
  const [isSearching1, setIsSearching1] = useState(false);
  const [isSearching2, setIsSearching2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const delayedQuery1 = useCallback(
    _.debounce((q, callback) => {
      if (q && trie) {
        const suggestions = trie.getWordsWithPrefix(q);
        callback(suggestions);
        setMatches1(suggestions.length);
      } else {
        callback([]);
        setMatches1(0);
      }
    }, 1000),
    [trie]
  );

  const delayedQuery2 = useCallback(
    _.debounce((q, callback) => {
      if (q && trie) {
        const suggestions = trie.getWordsWithPrefix(q);
        callback(suggestions);
        setMatches2(suggestions.length);
      } else {
        callback([]);
        setMatches2(0);
      }
    }, 1000),
    [trie]
  );

  const makeHandleInputChange = (setSearch, setIsSearching, delayedQuery, setSuggestions) => (e) => {
    setSearch(e.target.value);
    setIsSearching(true);
    delayedQuery.cancel();
    delayedQuery(e.target.value, (suggestions) => {
      setSuggestions(suggestions);
      setIsSearching(false);
    });
  };
  
  const makeHandleSelectChange = (setSearch, setSuggestions, setMatches) => (e) => {
    setSearch(e.target.value);
    setSuggestions([e.target.value]);
    setMatches(1);
  };
  
  const handleInputChange1 = makeHandleInputChange(setSearch1, setIsSearching1, delayedQuery1, setSuggestions1);
  const handleInputChange2 = makeHandleInputChange(setSearch2, setIsSearching2, delayedQuery2, setSuggestions2);
  
  const handleSelectChange1 = makeHandleSelectChange(setSearch1, setSuggestions1, setMatches1);
  const handleSelectChange2 = makeHandleSelectChange(setSearch2, setSuggestions2, setMatches2);

  useEffect(() => {
    if (suggestions1.length > 0 && suggestions2.length > 0 && search1.length > 0 && search2.length > 0) {
      setButtonVisible(true);
    } else {
      setButtonVisible(false);
    }
  }, [suggestions1, suggestions2, search1, search2]);  

  const openWikiPage = (playerName) => {
    let link = linkDict[playerName]
    window.open(link, '_blank');
  };

  return (
    <div className="container">
      <div className = "select-container">
        <div className="player-one-container">
        <div className="search-container">
          <input
            type="text"
            value={search1}
            onChange={handleInputChange1}
            className="player-search"
          />
          <select 
            onChange={handleSelectChange1}
            className={`select-menu ${isSearching1 ? 'shake' : ''}`}>
            {suggestions1.map((item, index) => (
              <option className="player-option" key={index} value={item}>{item}</option>
            ))}
          </select>
          <p>{matches1} matches found</p>
        </div>
      </div>
        <p className="connecting-text">to</p>
        <div className="player-two-container">
          <div className="search-container">
            <input
              type="text"
              value={search2}
              onChange={handleInputChange2}
              className="player-search"
            />
            <select 
              onChange={handleSelectChange2}
              className={`select-menu ${isSearching2 ? 'shake' : ''}`}>
              {suggestions2.map((item, index) => (
                <option className="player-option" key={index} value={item}>{item}</option>
              ))}
            </select>
            <p>{matches2} matches found</p>
          </div>
        </div>
      </div>
      <div className="button-container">
        <button 
          disabled={isLoading}
          className={`animated-button 
              ${buttonVisible ? 'visible' : 'hidden'}
              ${isLoading ? 'shake' : ''}`} onClick={getConnection}>Find Connection</button>
        <p
          disabled={isLoading} 
          className={`bell 
              ${buttonVisible ? 'visible' : 'hidden'}
              ${isLoading ? '' : 'shake-violently'}`}>
            🔔
          </p>
      </div>
      <div className="results-container">
        {Object.entries(results).map(([key, value], index) => {
          // This is the start player!
          if (typeof value === 'string') {
            return (
              <>
                <button onClick={() => openWikiPage(value)} className="start-player" key={value}>{value} 🔴</button>
              </>
            );
          } else {
            // If it's the last player, this is the bloke we're trying to connect to. Give him a green emoji.
            if (index === Object.entries(results).length - 1) {
              return (
                <>
                  <div className="player-text-container">
                    <p className="connection-text">Played for <strong>{`${value.Club}`}</strong> ({`${value.Duration}`}) the same time as</p>
                    <button onClick={() => openWikiPage(value.Player)} className="player" key={value.Player}>{`${value.Player}`} 🟢</button>
                  </div>
                </>
              );
            } else {
              return (
              <>
                <div className="player-text-container">
                  <p className="connection-text">Played for <strong>{`${value.Club}`}</strong> ({`${value.Duration}`}) the same time as</p>
                  <button onClick={() => openWikiPage(value.Player)} className="player" key={value.Player}>{`${value.Player}`}</button>
                </div>
              </>
            );
          }
        }
        })}
      </div>
    </div>
  );
};

export default Machine;