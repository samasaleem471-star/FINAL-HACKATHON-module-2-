// SUPABASE
let supabaseUrl = "https://crbeekfpkgentygvmpan.supabase.co";
let supabaseKey = "sb_publishable_UnIX2XJfbSOHPYqgTIq_Ew_7CCBRPpC";

const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);

// console.log(client);

// SIGN UP FORM
let signupForm = document.querySelector("#signupForm");
let fullName = document.querySelector("#fullName");
let signupEmail = document.querySelector("#signupEmail");
let signupPassword = document.querySelector("#signupPassword");
let confirmPassword = document.querySelector("#confirmPassword");
let createAccountBtn = document.querySelector("#createAccountBtn");

signupForm &&
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      if (signupPassword.value !== confirmPassword.value) {
        alert("Passwords do not match");
      } else if (signupPassword.value.length < 6) {
        alert("Password must be at least 6 characters");
      } else {
        // supabase sign up
        const { data, error } = await client.auth.signUp({
          email: signupEmail.value,
          password: signupPassword.value,
          options: {
            data: {
              full_name: fullName.value,
            },
          },
        });
        if (error) throw error;

        signupForm.reset();
        window.location.href = "dashboard.html";
      }
    } catch (err) {
      console.log(err.message);
      Swal.fire(err.message);
    }
  });

//   LOGIN FORM
let loginForm = document.querySelector("#loginForm");
let loginPassword = document.querySelector("#loginPassword");
let loginEmail = document.querySelector("#loginEmail");
let loginBtn = document.querySelector("#loginBtn");

loginForm &&
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      // supabase login
      const { data, error } = await client.auth.signInWithPassword({
        email: loginEmail.value,
        password: loginPassword.value,
      });
      if (error) throw error;

      window.location.href = "dashboard.html";
    } catch (err) {
      console.log("login error " + err);
    }
  });

// LOGOUT BUTTON
let logoutBtn = document.querySelector("#logoutBtn");

logoutBtn &&
  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to log out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const { error } = await client.auth.signOut();

      if (error) {
        console.log("logout error", error);
        return;
      }

      // window.location.href = "../index.html";
      window.location.href = location.pathname.includes("/pages/")
        ? "../index.html"
        : "index.html";
    }
  });

// USER EMAIL OR NAME UI
async function loadUser() {
  const { data } = await client.auth.getSession();
  const user = data.session ? data.session.user : null;

  if (user) {
    const name = user.user_metadata.full_name || user.email;

    document.querySelector("#welcomeName").textContent = name;
    document.querySelector("#userName").textContent = name;
    document.querySelector("#userEmail").textContent = user.email;
  } else {
    window.location.href = "login.html";
  }
}
// run on the dashboard page
if (document.querySelector("#welcomeName")) {
  loadUser();
}

// NAVBAR UI ACC TO USERS LOGIN
async function checkUser() {
  const { data } = await client.auth.getSession();
  let loggedIn = data.session !== null;

  let guestLinks = document.querySelectorAll(".guest-only");
  let userLinks = document.querySelectorAll(".user-only");

  guestLinks.forEach((item) => {
    item.classList.toggle("d-none", loggedIn);
  });

  userLinks.forEach((item) => {
    item.classList.toggle("d-none", !loggedIn);
  });
}

checkUser();

async function redirectIfLoggedIn() {
  const { data } = await client.auth.getSession();

  if (data.session) {
    window.location.href = "dashboard.html";
  }
}

if (
  document.querySelector("#loginForm") ||
  document.querySelector("#signupForm")
) {
  redirectIfLoggedIn();
}

// EDIT  BTTON FUNCTIONING
let editId = window.location.search.split("=")[1];

async function fillFormForEdit() {
  const { data, error } = await client
    .from("recipes")
    .select("*")
    .eq("id", editId)
    .single();

  if (error) {
    console.log(error);
    return;
  }

  document.querySelector("#title").value = data.title;
  document.querySelector("#category").value = data.category_id;
  document.querySelector("#description").value = data.description;
  document.querySelector("#instructions").value = data.instructions;
  document.querySelector("#cookingTime").value = data.cooking_time;
  if (data.image_url) {
    document.querySelector("#imagePreview").src = data.image_url;
    document.querySelector("#imagePreview").classList.remove("d-none");
  }
  // reassign
  document.querySelector("#pageTitle").textContent = "Edit recipe";
  document.querySelector("#postBtn").textContent = "Save changes";
}

if (document.querySelector("#recipeForm") && editId) {
  fillFormForEdit();
}

// NEW RECIPE POST
let recipeForm = document.querySelector("#recipeForm");

recipeForm &&
  recipeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "login.html";
      return;
    }
    let userId = sessionData.session.user.id;

    let recipeData = {
      category_id: document.querySelector("#category").value,
      title: document.querySelector("#title").value,
      description: document.querySelector("#description").value,
      instructions: document.querySelector("#instructions").value,
      cooking_time: document.querySelector("#cookingTime").value,
    };

    // IMAGE UPLOAD (agar nayi image select ki hai)
    let imageFile = recipeImageInput.files[0];

    if (imageFile) {
      let fileName = `${userId}-${Date.now()}-${imageFile.name}`;

      const { error: uploadError } = await client.storage
        .from("recipe-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        Swal.fire(
          "Error",
          "Image upload failed: " + uploadError.message,
          "error",
        );
        return;
      }

      const { data: urlData } = client.storage
        .from("recipe-images")
        .getPublicUrl(fileName);

      recipeData.image_url = urlData.publicUrl;
    }

    let error;

    if (editId) {
      const result = await client
        .from("recipes")
        .update(recipeData)
        .eq("id", editId);
      error = result.error;
    } else {
      recipeData.user_id = userId;
      const result = await client.from("recipes").insert(recipeData);
      error = result.error;
    }

    if (error) {
      Swal.fire("Error", error.message, "error");
    } else {
      await Swal.fire("Done!", "Your recipe was saved.", "success");
      window.location.href = "my-recipes.html";
    }
  });

// SHOW 3 POSTS ON DASHBOARD
let recentRecipes = document.querySelector("#recentRecipes");

async function loadRecentRecipes() {
  let basePath = location.pathname.includes("/pages/") ? "" : "pages/";
  const { data, error } = await client
    .from("recipes")
    .select("*, categories(name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.log(error);
    return;
  }

  if (data.length === 0) {
    recentRecipes.innerHTML = "<p class='text-secondary'>No recipes yet.</p>";
    return;
  }

  for (let i = 0; i < data.length; i++) {
    let r = data[i];

    recentRecipes.innerHTML += `
      <div class="col-md-6 col-lg-4">
<a href="${basePath}recipe-details.html?id=${r.id}" class="card recipe-card h-100 text-decoration-none text-reset">
          <div class="recipe-img d-flex align-items-center justify-content-center">
            ${
              r.image_url
                ? `<img src="${r.image_url}" alt="${r.title}" class="w-100 h-100" style="object-fit: cover;">`
                : "🍽️"
            }
          </div>
          <div class="card-body d-flex flex-column gap-2">
            <span class="badge badge-cat align-self-start rounded-pill px-3">${r.categories.name}</span>
            <h3 class="h5 fw-bold mb-0">${r.title}</h3>
            <p class="text-secondary small mb-0">${r.description}</p>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between small text-secondary">
            <span>By ${r.profiles.full_name}</span>
            <span>${r.cooking_time} min · ${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        </a>
      </div>`;
  }
}

recentRecipes && loadRecentRecipes();

// SHOW POSTS ON MY RECIPE PAGE
let myRecipes = document.querySelector("#myRecipes");

async function loadMyRecipes() {
  // 1. find out who is logged in
  const { data: sessionData } = await client.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "login.html";
    return;
  }

  let userId = sessionData.session.user.id;

  const { data, error } = await client
    .from("recipes")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  if (data.length === 0) {
    myRecipes.innerHTML =
      "<p class='text-secondary'>You have not posted any recipes yet.</p>";
    return;
  }

  for (let i = 0; i < data.length; i++) {
    let r = data[i];

    myRecipes.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <div class="card recipe-card h-100">
          <div class="recipe-img d-flex align-items-center justify-content-center">
            ${
              r.image_url
                ? `<img src="${r.image_url}" alt="${r.title}" class="w-100 h-100" style="object-fit: cover;">`
                : "🍽️"
            }
          </div>
          <div class="card-body d-flex flex-column gap-2">
            <span class="badge badge-cat align-self-start rounded-pill px-3">${r.categories.name}</span>
            <h3 class="h5 fw-bold mb-0">${r.title}</h3>
            <p class="text-secondary small mb-0">${r.description}</p>
            <div class="small text-secondary mt-1">
              <i class="bi bi-clock me-1"></i>${r.cooking_time} min · ${new Date(r.created_at).toLocaleDateString()}
            </div>
          </div>
          <div class="card-footer bg-white d-flex gap-2">
            <a href="recipe-details.html?id=${r.id}" class="btn btn-outline-primary btn-sm flex-fill">View</a>
            <a href="create-recipe.html?id=${r.id}" class="btn btn-outline-secondary btn-sm flex-fill">Edit</a>
            <button type="button" class="btn btn-outline-danger btn-sm flex-fill deleteBtn" data-id="${r.id}">Delete</button>
          </div>
        </div>
      </div>`;
  }
}

myRecipes && loadMyRecipes();

// SHOW ALL POSTS
let allRecipes = document.querySelector("#allRecipes");
let searchInput = document.querySelector("#searchInput");
let categoryFilter = document.querySelector("#categoryFilter");
let filterForm = document.querySelector("#filterForm");

let recipesList = [];

// get  recipes from Supabase
async function loadAllRecipes() {
  const { data, error } = await client
    .from("recipes")
    .select("*, categories(name), profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  recipesList = data;
  showRecipes();
}

function showRecipes() {
  let searchText = searchInput.value.toLowerCase();
  let category = categoryFilter.value;
  let cards = "";

  for (let i = 0; i < recipesList.length; i++) {
    let r = recipesList[i];

    let titleMatches = r.title.toLowerCase().includes(searchText);
    let categoryMatches = category === "" || r.categories.name === category;

    if (titleMatches && categoryMatches) {
      cards += `
        <div class="col-md-6 col-lg-4">
          <a href="recipe-details.html?id=${r.id}" class="card recipe-card h-100 text-decoration-none text-reset">
            <div class="recipe-img d-flex align-items-center justify-content-center">
              ${
                r.image_url
                  ? `<img src="${r.image_url}" alt="${r.title}" class="w-100 h-100" style="object-fit: cover;">`
                  : "🍽️"
              }
            </div>
            <div class="card-body d-flex flex-column gap-2">
              <span class="badge badge-cat align-self-start rounded-pill px-3">${r.categories.name}</span>
              <h3 class="h5 fw-bold mb-0">${r.title}</h3>
              <p class="text-secondary small mb-0">${r.description}</p>
            </div>
            <div class="card-footer bg-white d-flex justify-content-between small text-secondary">
              <span><i class="bi bi-person me-1"></i>${r.profiles.full_name}</span>
              <span><i class="bi bi-clock me-1"></i>${r.cooking_time} min · ${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          </a>
        </div>`;
    }
  }

  if (cards === "") {
    cards = "<p class='text-secondary'>No recipes found.</p>";
  }

  allRecipes.innerHTML = cards;
}
if (allRecipes) {
  searchInput.addEventListener("input", showRecipes);
  categoryFilter.addEventListener("change", showRecipes);

  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showRecipes();
  });

  loadAllRecipes();
}

// DELETE BTTON FUNCTIONING
myRecipes &&
  myRecipes.addEventListener("click", async (event) => {
    if (!event.target.classList.contains("deleteBtn")) {
      return;
    }

    let recipeId = event.target.dataset.id;

    const result = await Swal.fire({
      title: "Delete this recipe?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const { error } = await client
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      if (error) {
        console.log("Error", error.message);

        swal.fire("something went wrong, pleasy try again later");
      } else {
        await Swal.fire("Deleted", "Your recipe was deleted.", "success");
        window.location.reload();
      }
    }
  });

// SHOW SINGLE RECIPE DETAILS
let recipeDetails = document.querySelector("#recipeDetails");

async function loadRecipeDetails() {
  let recipeId = window.location.search.split("=")[1];

  const { data, error } = await client
    .from("recipes")
    .select("*, categories(name), profiles(full_name)")
    .eq("id", recipeId)
    .single();

  if (error || !data) {
    console.log(error);
    recipeDetails.classList.add("d-none");
    document.querySelector("#recipeNotFound").classList.remove("d-none");
    return;
  }
  if (data.image_url) {
    document.querySelector("#recipeImg").innerHTML =
      `<img src="${data.image_url}" alt="${data.title}" class="w-100 h-100 rounded-4" style="object-fit: cover;">`;
  }

  document.querySelector("#recipeCategory").textContent = data.categories.name;

  document.querySelector("#recipeCategory").textContent = data.categories.name;
  document.querySelector("#recipeTitle").textContent = data.title;
  document.querySelector("#recipeDescription").textContent = data.description;
  document.querySelector("#recipeInstructions").textContent = data.instructions;
  document.querySelector("#recipeTime").textContent = data.cooking_time;
  document.querySelector("#recipeAuthor").textContent = data.profiles.full_name;
  document.querySelector("#recipeDate").textContent = new Date(
    data.created_at,
  ).toLocaleDateString();
}

recipeDetails && loadRecipeDetails();

// SHOW IMG
let recipeImageInput = document.querySelector("#recipeImage");
let imagePreview = document.querySelector("#imagePreview");

recipeImageInput &&
  recipeImageInput.addEventListener("change", () => {
    let file = recipeImageInput.files[0];
    if (file) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.classList.remove("d-none");
    }
  });
