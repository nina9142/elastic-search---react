import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('free_search'); // Default search type
  const [results, setResults] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
  };

  // Parse and upload the CSV to Elasticsearch
  const uploadCSVToElasticsearch = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data;
        
        // Send the data to Elasticsearch in bulk
        for (const record of data) {
          try {
            await axios.post('http://localhost:9200/your_index/_doc', record);
          } catch (error) {
            console.error('Error uploading to Elasticsearch:', error);
          }
        }
        alert('Data uploaded to Elasticsearch successfully');
      }
    });
  };

  // Handle search
  const handleSearch = async () => {
    try {
      const response = await axios.post('http://localhost:9200/your_index/_search', {
        size: 6,
        query: getQuery(),
      });

      const hits = response.data.hits.hits.filter((hit) => !deletedIds.includes(hit._id));
      setResults(hits);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Get query based on search type
  const getQuery = () => {
    switch (searchType) {
      case 'exact_search':
        return { match: { _all: searchTerm } };
      case 'whole_expression':
        return { match_phrase: { _all: searchTerm } };
      default:
        return { match: { name: searchTerm } }; // Default search on 'name' field
    }
  };

  // Handle delete
  const handleDelete = (id) => {
    setDeletedIds([...deletedIds, id]);
    setResults(results.filter((result) => result._id !== id));
  };

  return (
    <div className="App">
      <h1>Elasticsearch CSV Upload & Search</h1>
      
      <div>
        <input type="file" onChange={handleFileUpload} />
        <button onClick={uploadCSVToElasticsearch}>Upload CSV to Elasticsearch</button>
      </div>
      
      <div>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          placeholder="Search..." 
        />
      </div>

      <div>
        <label>
          <input 
            type="radio" 
            value="free_search" 
            checked={searchType === 'free_search'} 
            onChange={() => setSearchType('free_search')} 
          />
          Free Search (default: name)
        </label>

        <label>
          <input 
            type="radio" 
            value="exact_search" 
            checked={searchType === 'exact_search'} 
            onChange={() => setSearchType('exact_search')} 
          />
          Exact Search from All Fields
        </label>

        <label>
          <input 
            type="radio" 
            value="whole_expression" 
            checked={searchType === 'whole_expression'} 
            onChange={() => setSearchType('whole_expression')} 
          />
          Whole Expression Search
        </label>
      </div>

      <div>
        <button onClick={handleSearch}>Search</button>
      </div>

      <div>
        <h2>Results:</h2>
        {results.map((result) => (
          <div key={result._id}>
            <p>{result._source.name || 'No Name Field'}</p>
            <button onClick={() => handleDelete(result._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
