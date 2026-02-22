(() => {
    const controls = document.querySelector(".auth-controls");
    const trigger = document.getElementById("profile-menu-trigger");
    const menu = document.getElementById("profile-menu");
    const profileLink = menu?.querySelector("[data-profile-link]");

    if (!controls || !trigger || !menu) {
        return;
    }

    const isOpen = () => !menu.hidden;

    const openMenu = () => {
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
    };

    const closeMenu = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        if (isOpen()) {
            closeMenu();
            return;
        }
        openMenu();
    });

    menu.addEventListener("click", () => {
        closeMenu();
    });

    if (profileLink) {
        profileLink.addEventListener("click", (event) => {
            event.preventDefault();
            const hasToken = Boolean(localStorage.getItem("userToken"));
            window.location.href = hasToken ? "profile.html" : "login.html?next=index.html";
        });
    }

    document.addEventListener("click", (event) => {
        if (!controls.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen()) {
            closeMenu();
            trigger.focus();
        }
    });
})();
