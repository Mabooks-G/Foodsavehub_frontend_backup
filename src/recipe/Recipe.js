import React, { Component } from 'react';
import axios from "axios";
import "./Recipe.css";

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

class Recipe extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItems: [],
      items: [],
      inventory: [],        // rest of the food items
     filters: [],   // multiple filters instead of a single string
      recipes: [],         // store generated recipes
      showGeneratedPanel: false,  // toggle separate panel
      showSavedPanel: false,  // NEW flag for saved recipes
      loading: true,
      generating: false,      // NEW: for AI recipe generation
      error: "",
      showConfirmModal: false,   // modal visibility
      recipeToDelete: null,      // store which recipe is pending deletion
      aiMessage: "This is a temporary OpenAI message.",  // store AI response message
      selectedRecipe: null, // stores recipe to display in modal
  showDetailModal: false // controls modal visibility
    };
  }

  componentDidMount() {
    this.fetchExpiringItems();
  }

  openDetailModal = (recipe) => {
  this.setState({ selectedRecipe: recipe, showDetailModal: true });
};

closeDetailModal = () => {
  this.setState({ selectedRecipe: null, showDetailModal: false });
};


  showDeleteModal = (id, index) => {
  this.setState({ showConfirmModal: true, recipeToDelete: { id, index } });
};

hideDeleteModal = () => {
  this.setState({ showConfirmModal: false, recipeToDelete: null });
};

fetchInventory = async () => {
  try {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      this.setState({ error: "No logged-in user found." });
      return;
    }

    const res = await axios.get(`${API_BACKEND}/api/notifications/inventory`, {
      params: { 
        email: loggedInUser.email,
      }
    });

    console.log("Inventory API returned:", res.data);
    console.log("Expiring items state:", this.state.items);

    const inventoryItems = res.data.filter(
      name => !this.state.items.includes(name)
    );

    this.setState({ inventory: inventoryItems });
  } catch (err) {
    console.error("Error fetching inventory:", err);
  }
};


  
  fetchExpiringItems = async () => {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser) {
        this.setState({ error: "No logged-in user found.", loading: false });
        return;
      }

      const res = await axios.get(`${API_BACKEND}/api/notifications`, {
        params: { 
          email: loggedInUser.email,
          days: 7
         }
      });

      // ✅ API already filters items expiring in <= 2 days
      const items = res.data.map((item) => item.name);

      /*this.setState(
      { items: items.length > 0 ? items : ["No items expiring soon"], loading: false },
      () => {
        this.fetchInventory(); // ✅ Call after items state is updated
      }
    );*/

    /*this.setState(
      { items: items.length > 0 ? items : ["No items expiring soon"], loading: false },
    );*/

     this.setState(
      { items: items.length > 0 ? items : ["No items expiring soon"], loading: false },
      () => {
        // ✅ fetch inventory after items state is updated
        this.fetchInventory();
      }
    );

  } catch (err) {
    console.error("Error fetching expiring items:", err);
    this.setState({ error: "Failed to fetch expiring items.", loading: false });
  }
};

  toggleItem = (item) => {
    this.setState((prevState) => {
      const alreadySelected = prevState.selectedItems.includes(item);
      return {
        selectedItems: alreadySelected
          ? prevState.selectedItems.filter((i) => i !== item)
          : [...prevState.selectedItems, item]
      };
    });
  };

  handleFilterChange = (filterOption) => {
  this.setState((prevState) => {
    const alreadySelected = prevState.filters.includes(filterOption);
    return {
      filters: alreadySelected
        ? prevState.filters.filter((f) => f !== filterOption)
        : [...prevState.filters, filterOption],
    };
  });
};


 
  handleGenerate = async () => {
  const { selectedItems, filters } = this.state;

  if (selectedItems.length === 0) {
    alert("Please select at least one ingredient to generate a recipe.");
    return;
  }

  // 🔹 Set generating to true BEFORE starting API call
  this.setState({ generating: true });

  try {
    // Call backend API
    const res = await axios.post(`${API_BACKEND}/api/recipe/generate`, {
  ingredients: selectedItems,
  preferences: filters.length > 0 ? filters : ["None"] 
});

    const hardcodedImages = [
  "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1679556217543-c0cc895892f5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
];

    const recipes = res.data.suggestions.map((recipe, index) => ({
      ...recipe,
      expanded: false, // ensure expanded property exists for each recipe
      saved: false,
      image: hardcodedImages[index] || "https://images.unsplash.com/photo-1692288843207-786c8cb62e7a?q=80&w=1370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    }));

    this.setState({
      recipes,
      showGeneratedPanel: true,
      generating: false // stop spinner
    });
  } catch (err) {
    console.error("Error generating recipes:", err);
    alert("Failed to generate recipes. Please try again.");
    this.setState({ generating: false }); // stop spinner on error too
  }
};


  // Toggle function - FIXED
  toggleExpand = (index) => {
    console.log('Toggle clicked for index:', index); // Debug log
    this.setState(prevState => {
      const updatedRecipes = prevState.recipes.map((recipe, i) => {
        if (i === index) {
          return { ...recipe, expanded: !recipe.expanded };
        }
        return recipe;
      });
      console.log('Updated recipes:', updatedRecipes); // Debug log
      return { recipes: updatedRecipes };
    });
  };

  // Fetch saved recipes from backend
  fetchSavedRecipes = async () => {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!loggedInUser) {
        alert("You must be logged in to view saved recipes.");
        return;
      }

      const res = await axios.get(`${API_BACKEND}/api/recipe/saved`, {
        params: { email: loggedInUser.email } // for auth
      });

      const savedRecipes = res.data.recipes.map((recipe, index) => ({
        ...recipe,
        expanded: false,
      }));

      this.setState({
        recipes: savedRecipes,
        showSavedPanel: true,
        showGeneratedPanel: false
      });

    } catch (err) {
      console.error("Error fetching saved recipes:", err);
      alert("Failed to fetch saved recipes.");
    }
  };

  handleBack = () => {
    this.setState({
      showGeneratedPanel: false,
      showSavedPanel: false,
      recipes: []
    });
  };

  handleSave = async (recipe, index) => {
  try {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("You must be logged in to save recipes.");
      return;
    }

    await axios.post(`${API_BACKEND}/api/recipe/save`,{
      email: loggedInUser.email,  // include email for backend auth
      title: recipe.title,
      prep_time: recipe.prepTime,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      preferences: this.state.filters.length > 0 ? this.state.filters : ["None"] // <-- default
    });

     // ✅ Update the saved flag
    this.setState((prevState) => {
      const updatedRecipes = [...prevState.recipes];
      updatedRecipes[index] = { ...updatedRecipes[index], saved: true };
      return { recipes: updatedRecipes };
    });

  } catch (err) {
    console.error("Error saving recipe:", err);
    alert("Failed to save recipe. Please try again.");
  }
};

handleDelete = async (recipeId, index) => {
  const { recipeToDelete } = this.state;
  if (!recipeToDelete) return;

  try {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      return;
    }

    await axios.delete(`${API_BACKEND}/api/recipe/delete`, {
      data: { email: loggedInUser.email, recipeId } // pass recipeId + email
    });
 // ✅ Close the detail modal as well
    this.closeDetailModal();

    // ✅ Remove recipe from state
    this.setState((prevState) => {
      const updatedRecipes = [...prevState.recipes];
      updatedRecipes.splice(recipeToDelete.index, 1); // remove the deleted recipe
      return { recipes: updatedRecipes, showConfirmModal: false, recipeToDelete: null };
    });

  } catch (err) {
    console.error("Error deleting recipe:", err);
    alert("Failed to delete recipe. Please try again.");
    this.hideDeleteModal();
  }
};


  // Inside your Recipe component
// Inside your Recipe component
ifShowSavedPanel = () => {
  const { recipes, showConfirmModal, recipeToDelete, selectedRecipe, showDetailModal } = this.state;

  return (
    <>
      <div className="recipe-container">
        <div className="recipe-card">
          <h2 className="recipe-title">Saved Recipes</h2>
          <p style={{ fontStyle: "italic", color: "#555", marginBottom: "10px" }}>
            Click anywhere on a recipe card to view the details
          </p>

          <div className="recipe-results">
            {recipes.map((recipe, index) => (
              <div
                key={index}
                className="recipe-result-card"
                onClick={() => this.openDetailModal(recipe)}
              >
                {!recipe?.expanded ? (
                  <>
                    <img
                      src="https://pbs.twimg.com/media/D-ZJuhVU8AA_2jS.jpg:large"
                      alt={recipe?.title || "Recipe Image"}
                    />
                    <h3>{recipe?.title || "Untitled"}</h3>
                    <p>Prep: {recipe?.prepTime || "N/A"}</p>

                    {recipe?.preferences && (
                     <p>
  Preferences:{" "}
  {selectedRecipe?.preferences && selectedRecipe.preferences.length > 0
    ? Array.isArray(selectedRecipe.preferences)
      ? selectedRecipe.preferences.join(", ")
      : selectedRecipe.preferences
    : "None"}
</p>


                    )}

                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        this.showDeleteModal(recipe?.id, index);
                      }}
                    >
                      Delete Recipe
                    </button>
                  </>
                ) : (
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1640517853869-6c7ae166884f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0"
                      alt={recipe?.title || "Recipe Image"}
                      className="recipe-detail-image"
                    />
                    <h3>{recipe?.title || "Untitled"}</h3>
                    <p>Prep Time:{recipe?.prepTime || "N/A"}</p>

                    <div className="recipe-details">
                      <h4>Ingredients:</h4>
                      <ul>
                        {recipe?.ingredients?.map((ingredient, i) => (
                          <li key={i}>{ingredient}</li>
                        )) || <li>No ingredients listed</li>}
                      </ul>

                      <h4>Steps:</h4>
                      <ol>
                        {recipe?.steps?.map((step, i) => (
                          <li key={i}>{step}</li>
                        )) || <li>No steps listed</li>}
                      </ol>

                      {recipe?.preferences && (
                        <p>
  Preferences:{" "}
  {selectedRecipe?.preferences && selectedRecipe.preferences.length > 0
    ? Array.isArray(selectedRecipe.preferences)
      ? selectedRecipe.preferences.join(", ")
      : selectedRecipe.preferences
    : "None"}
</p>



                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <button
            className="generate-btn"
            style={{ marginTop: "20px" }}
            onClick={this.handleBack}
          >
            Back
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && recipeToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Are you sure?</h3>
            <p>Do you really want to delete this recipe? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button
                className="modal-btn confirm"
                onClick={() =>
                  this.handleDelete(recipeToDelete.id, recipeToDelete.index)
                }
              >
                Yes, delete
              </button>
              <button className="modal-btn cancel" onClick={this.hideDeleteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {showDetailModal && selectedRecipe && (
        <div className="modal-overlay" onClick={this.closeDetailModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedRecipe?.title || "Untitled"}</h2>
            <p>Prep Time: {selectedRecipe?.prepTime || "N/A"}</p>

            {selectedRecipe?.preferences && (
             <p>
  Preferences:{" "}
  {selectedRecipe?.preferences && selectedRecipe.preferences.length > 0
    ? Array.isArray(selectedRecipe.preferences)
      ? selectedRecipe.preferences.join(", ")
      : selectedRecipe.preferences
    : "None"}
</p>



            )}

            <div className="recipe-details">
              <h4>Ingredients:</h4>
              <ul>
                {selectedRecipe?.ingredients?.map((i, idx) => (
                  <li key={idx}>{i}</li>
                )) || <li>No ingredients listed</li>}
              </ul>

              <h4>Steps:</h4>
              <ol>
                {selectedRecipe?.steps?.map((s, idx) => (
                  <li key={idx}>{s}</li>
                )) || <li>No steps listed</li>}
              </ol>
            </div>

            <button
              className="generate-btn"
              onClick={this.closeDetailModal}
              style={{ marginTop: "10px", width: "100%" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};



render() {
  const {
    selectedItems,
    items,
    inventory,
    filters,
    recipes,
    showGeneratedPanel,
    showSavedPanel,
    loading,
    error,
    generating,
    showConfirmModal,
    recipeToDelete,
    showDetailModal,
    selectedRecipe
  } = this.state;

  // Loading states
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your food items....</p>
      </div>
    );
  }

  if (error) {
    return <p className="error-msg">{error}</p>;
  }

  if (generating) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Generating your recipes...</p>
      </div>
    );
  }

  // Modals
  const modal = (
    <>
      {/* Delete Confirmation Modal */}
      {showConfirmModal && recipeToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Are you sure?</h3>
            <p>Do you really want to delete this recipe? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button
                className="modal-btn confirm"
                onClick={() =>
                  this.handleDelete(recipeToDelete.id, recipeToDelete.index)
                }
              >
                Yes, delete
              </button>
              <button className="modal-btn cancel" onClick={this.hideDeleteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
{showDetailModal && selectedRecipe && (
  <div className="modal-overlay" onClick={this.closeDetailModal}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>{selectedRecipe.title}</h2>
     
      <p>Prep Time: {selectedRecipe.prepTime}</p>
     {/* NEW: Preferences */}
{selectedRecipe.preferences && (
  <p>
  Preferences:{" "}
  {selectedRecipe?.preferences && selectedRecipe.preferences.length > 0
    ? Array.isArray(selectedRecipe.preferences)
      ? selectedRecipe.preferences.join(", ")
      : selectedRecipe.preferences
    : "None"}
</p>


)}


      <div className="recipe-details">
        <h4>Ingredients:</h4>
        <ul>
          {selectedRecipe.ingredients.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>

        <h4>Steps:</h4>
        <ol>
          {selectedRecipe.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>


        
      </div>

      <button
        className="generate-btn"
        onClick={this.closeDetailModal}
        style={{ marginTop: "10px", width: '100%' }}
      >
        Close
      </button>
    </div>
  </div>
)}

    </>
  );

  // Saved Recipes Panel
  const savedPanel = showSavedPanel && this.ifShowSavedPanel();

  // Generated Recipes Panel
  const generatedPanel = showGeneratedPanel && (
    <div className="recipe-container">
      <div className="recipe-card">
        <h2 className="recipe-title">Generated Recipes</h2>
        <p style={{ fontStyle: "italic", color: "#555", marginBottom: "10px" }}>
          Click anywhere on a recipe card to view the details
        </p>

        <div className="recipe-results">
          {recipes.map((recipe, index) => (
            <div
              key={index}
              className="recipe-result-card"
              onClick={() => this.openDetailModal(recipe)}
            >
              {!recipe.expanded ? (
                <>
                  <img src={"https://media.istockphoto.com/id/1365005008/vector/bread-and-bakery-product-emoji-vector-illustration-set.jpg?s=612x612&w=0&k=20&c=8eGCvGb5H1pE2vHleMbRnddX2QlJUsXPBMoENvfImQ8="} alt={recipe.title} />
                  <h3>{recipe.title}</h3>
                  <p>Prep: {recipe.prepTime}</p>
                  <button
                    className="save-btn"
                    disabled={recipe.saved}
                    onClick={(e) => {
                      e.stopPropagation();
                      this.handleSave(recipe, index);
                    }}
                  >
                    {recipe.saved ? "Recipe Saved" : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <img
                    src={"https://media.istockphoto.com/id/1365005008/vector/bread-and-bakery-product-emoji-vector-illustration-set.jpg?s=612x612&w=0&k=20&c=8eGCvGb5H1pE2vHleMbRnddX2QlJUsXPBMoENvfImQ8="}
                    alt={recipe.title}
                    className="recipe-detail-image"
                  />
                  <h3>{recipe.title}</h3>
                  <p>Prep Time: {recipe.prepTime}</p>

                  <div className="recipe-details">
                    <h4>Ingredients:</h4>
                    <ul>
                      {recipe.ingredients.map((ingredient, i) => (
                        <li key={i}>{ingredient}</li>
                      ))}
                    </ul>

                    <h4>Steps:</h4>
                    <ol>
                      {recipe.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button
          className="generate-btn"
          style={{ marginTop: "20px" }}
          onClick={this.handleBack}
        >
          Back
        </button>
      </div>
    </div>
  );

  // AI Recipe Generator Panel
  const aiPanel = !showGeneratedPanel && !showSavedPanel && (
    <div className="notification-wrapper" style={{ display: "flex", gap: "20px" }}>
      <div className="recipe-container">
        <div className="recipe-card">
          <h2 className="recipe-title">AI Recipe Generator</h2>

          <div className="recipe-list">
            {items.map((item, index) => (
              <label key={index}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item)}
                  onChange={() => this.toggleItem(item)}
                />
                {item}
              </label>
            ))}
          </div>

          <h2 className="recipe-title">Other Inventory Items</h2>
          <div className="recipe-list">
            {inventory.map((item, index) => (
              <label key={index}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item)}
                  onChange={() => this.toggleItem(item)}
                />
                {item}
              </label>
            ))}
          </div>

  <div className="filter-options">
  <h4 className="filter-title">Filter by:</h4>

  <ul>
    {["Vegan", "Vegetarian", "Gluten-Free"].map(option => (
      <li key={option}>
        <label className="filter-item">
          <input
            type="checkbox"
            checked={this.state.filters.includes(option)}
            onChange={() => this.handleFilterChange(option)}
          />
          <span>{option}</span>
        </label>
      </li>
    ))}
  </ul>
</div>



          <button className="generate-btn" onClick={this.handleGenerate}>
            Generate New Recipe
          </button>

          <p className="recipe-subtitle">
            View your saved recipes below.
          </p>
          <button className="generate-btn" onClick={this.fetchSavedRecipes}>
            View Saved Recipes
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {modal}
      {aiPanel}
      {generatedPanel}
      {savedPanel}
    </>
  );
}
}

export default Recipe;