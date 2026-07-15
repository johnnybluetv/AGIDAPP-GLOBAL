export type Language = "en" | "es" | "fr" | "de";

export interface TranslationDict {
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  clearHistory: string;
  clearHistoryConfirmTitle: string;
  clearHistoryConfirmDesc: string;
  clearHistoryConfirmButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDesc: string;
  cancel: string;
  delete: string;
  signIn: string;
  signUp: string;
  postSomething: string;
  adminPortal: string;
  indexPopular: string;
  indexingRunning: string;
  recommenderTitle: string;
  recommenderSubtitle: string;
  recommenderPromptLabel: string;
  recommenderPlaceholder: string;
  recommenderSubmit: string;
  recommenderReset: string;
  recommenderResultsTitle: string;
  recommenderNoResults: string;
  recommenderFocusCode: string;
  recommenderFocusCreative: string;
  recommenderFocusWriting: string;
  recommenderFocusProductivity: string;
  communitySpotlight: string;
  communitySpotlightDesc: string;
  mainDirectory: string;
  mainDirectoryDesc: string;
  allCategories: string;
  allTypes: string;
  favoritesOnly: string;
  comparisonTitle: string;
  compareButton: string;
  noToolsFound: string;
  recentQueries: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    heroTitle: "Artificial General Intelligence Directory",
    heroSubtitle: "Curate, compare, and manage trending AI and AGI solutions for digital growth and humanity.",
    searchPlaceholder: "Ask in plain language, e.g., 'I want a tool to generate audio from text'...",
    clearHistory: "Clear History",
    clearHistoryConfirmTitle: "Clear Search History?",
    clearHistoryConfirmDesc: "This will permanently delete all of your recent tool queries from this device's local storage. This action cannot be undone.",
    clearHistoryConfirmButton: "Confirm Clear",
    deleteConfirmTitle: "Permanently Delete Tool?",
    deleteConfirmDesc: "Are you sure you want to delete this tool? This action is permanent and will remove the tool from the global directory for all users.",
    cancel: "Cancel",
    delete: "Delete",
    signIn: "Sign In",
    signUp: "Sign Up",
    postSomething: "Post Something",
    adminPortal: "Admin Portal",
    indexPopular: "Index Popular AIs",
    indexingRunning: "INDEXING_CORE_MODELS...",
    recommenderTitle: "AI Matchmaker: Smart Recommender",
    recommenderSubtitle: "Let our cognitive filter identify the best artificial general intelligence tools for your specific workflow.",
    recommenderPromptLabel: "What are you trying to build or solve?",
    recommenderPlaceholder: "Describe your project (e.g., 'I want to build a voiceover for my videos and generate code')",
    recommenderSubmit: "Analyze & Recommend",
    recommenderReset: "Reset Finder",
    recommenderResultsTitle: "Highly Recommended Tools For You",
    recommenderNoResults: "No matching tools found. Try selecting another focus or entering different criteria.",
    recommenderFocusCode: "Software Dev",
    recommenderFocusCreative: "Video & Design",
    recommenderFocusWriting: "Content & Copy",
    recommenderFocusProductivity: "Research & Office",
    communitySpotlight: "Community Spotlight",
    communitySpotlightDesc: "The most popular tools as voted by members",
    mainDirectory: "Main Directory",
    mainDirectoryDesc: "Explore the fully updated catalog of verified cognitive models and services",
    allCategories: "All Categories",
    allTypes: "All Types",
    favoritesOnly: "Show Favorites Only",
    comparisonTitle: "Compare Tools",
    compareButton: "Compare",
    noToolsFound: "No AI tools registered under those specifications yet.",
    recentQueries: "Recent Tool Queries",
  },
  es: {
    heroTitle: "Directorio de Inteligencia General Artificial",
    heroSubtitle: "Organiza, compara y gestiona soluciones de IA y AGI en tendencia para el crecimiento digital y la humanidad.",
    searchPlaceholder: "Pregunta en lenguaje natural, ej. 'quiero una herramienta para generar audio de texto'...",
    clearHistory: "Borrar Historial",
    clearHistoryConfirmTitle: "¿Borrar Historial de Búsqueda?",
    clearHistoryConfirmDesc: "Esto eliminará permanentemente todas tus consultas recientes del almacenamiento local de este dispositivo. Esta acción es irreversible.",
    clearHistoryConfirmButton: "Confirmar Borrado",
    deleteConfirmTitle: "¿Eliminar Herramienta Permanentemente?",
    deleteConfirmDesc: "¿Estás seguro de que deseas eliminar esta herramienta? Esta acción es permanente y la eliminará del directorio global para todos los usuarios.",
    cancel: "Cancelar",
    delete: "Eliminar",
    signIn: "Iniciar Sesión",
    signUp: "Registrarse",
    postSomething: "Publicar Algo",
    adminPortal: "Panel de Admin",
    indexPopular: "Indexar IAs Populares",
    indexingRunning: "INDEXANDO_MODELOS...",
    recommenderTitle: "Recomendador Inteligente de IA",
    recommenderSubtitle: "Deja que nuestro filtro cognitivo identifique las mejores herramientas de inteligencia general artificial para tu flujo de trabajo.",
    recommenderPromptLabel: "¿Qué estás intentando construir o resolver?",
    recommenderPlaceholder: "Describe tu proyecto (ej., 'quiero crear una voz en off para mis videos y generar código')",
    recommenderSubmit: "Analizar y Recomendar",
    recommenderReset: "Reiniciar Buscador",
    recommenderResultsTitle: "Herramientas Altamente Recomendadas Para Ti",
    recommenderNoResults: "No se encontraron herramientas coincidentes. Intenta seleccionar otro enfoque o ingresar diferentes criterios.",
    recommenderFocusCode: "Desarrollo",
    recommenderFocusCreative: "Video y Diseño",
    recommenderFocusWriting: "Contenido y Copia",
    recommenderFocusProductivity: "Investigación y Oficina",
    communitySpotlight: "Destacado de la Comunidad",
    communitySpotlightDesc: "Las herramientas más populares votadas por los miembros",
    mainDirectory: "Directorio Principal",
    mainDirectoryDesc: "Explora el catálogo completamente actualizado de modelos cognitivos y servicios verificados",
    allCategories: "Todas las Categorías",
    allTypes: "Todos los Tipos",
    favoritesOnly: "Mostrar Solo Favoritos",
    comparisonTitle: "Comparar Herramientas",
    compareButton: "Comparar",
    noToolsFound: "No hay herramientas de IA registradas bajo esas especificaciones todavía.",
    recentQueries: "Consultas Recientes",
  },
  fr: {
    heroTitle: "Annuaire d'Intelligence Artificielle Générale",
    heroSubtitle: "Organisez, comparez et gérez les solutions IA et AGI tendances pour la croissance numérique et l'humanité.",
    searchPlaceholder: "Demandez en langage simple, ex. 'je veux un outil pour générer du son à partir de texte'...",
    clearHistory: "Effacer l'historique",
    clearHistoryConfirmTitle: "Effacer l'historique de recherche ?",
    clearHistoryConfirmDesc: "Cela supprimera définitivement toutes vos requêtes récentes de l'espace de stockage local de cet appareil. Cette action est irréversible.",
    clearHistoryConfirmButton: "Confirmer l'effacement",
    deleteConfirmTitle: "Supprimer définitivement l'outil ?",
    deleteConfirmDesc: "Êtes-vous sûr de vouloir supprimer cet outil ? Cette action est définitive et le retirera de l'annuaire global pour tous les utilisateurs.",
    cancel: "Annuler",
    delete: "Supprimer",
    signIn: "Connexion",
    signUp: "S'inscrire",
    postSomething: "Publier quelque chose",
    adminPortal: "Portail Admin",
    indexPopular: "Indexer les IA Populaires",
    indexingRunning: "INDEXATION_EN_COURS...",
    recommenderTitle: "Recommandeur Intelligent d'IA",
    recommenderSubtitle: "Laissez notre filtre cognitif identifier les meilleurs outils d'intelligence artificielle générale pour votre flux de travail.",
    recommenderPromptLabel: "Qu'essayez-vous de créer ou de résoudre ?",
    recommenderPlaceholder: "Décrivez votre projet (ex. 'je veux créer une voix off pour mes vidéos et générer du code')",
    recommenderSubmit: "Analyser & Recommander",
    recommenderReset: "Réinitialiser",
    recommenderResultsTitle: "Outils Hautement Recommandés Pour Vous",
    recommenderNoResults: "Aucun outil correspondant trouvé. Essayez de sélectionner un autre domaine ou de modifier vos critères.",
    recommenderFocusCode: "Dév. Logiciel",
    recommenderFocusCreative: "Vidéo & Design",
    recommenderFocusWriting: "Contenu & Copie",
    recommenderFocusProductivity: "Recherche & Bureau",
    communitySpotlight: "Projecteur Communautaire",
    communitySpotlightDesc: "Les outils les plus populaires votés par les membres",
    mainDirectory: "Annuaire Principal",
    mainDirectoryDesc: "Explorez le catalogue entièrement mis à jour des modèles et services cognitifs vérifiés",
    allCategories: "Toutes les Catégories",
    allTypes: "Tous les Types",
    favoritesOnly: "Afficher uniquement les favoris",
    comparisonTitle: "Comparer les Outils",
    compareButton: "Comparer",
    noToolsFound: "Aucun outil d'IA enregistré sous ces spécifications pour le moment.",
    recentQueries: "Requêtes Récentes",
  },
  de: {
    heroTitle: "Verzeichnis für Künstliche Allgemeine Intelligenz",
    heroSubtitle: "Kuratieren, vergleichen und verwalten Sie trendige KI- und AGI-Lösungen für digitales Wachstum und die Menschheit.",
    searchPlaceholder: "Fragen Sie in natürlicher Sprache, z.B. 'Ich möchte ein Tool, um Audio aus Text zu generieren'...",
    clearHistory: "Verlauf löschen",
    clearHistoryConfirmTitle: "Suchverlauf löschen?",
    clearHistoryConfirmDesc: "Dadurch werden alle Ihre letzten Suchanfragen dauerhaft aus dem lokalen Speicher dieses Geräts gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
    clearHistoryConfirmButton: "Löschen bestätigen",
    deleteConfirmTitle: "Tool dauerhaft löschen?",
    deleteConfirmDesc: "Sind Sie sicher, dass Sie dieses Tool löschen möchten? Diese Aktion ist dauerhaft und entfernt das Tool für alle Benutzer aus dem globalen Verzeichnis.",
    cancel: "Abbrechen",
    delete: "Löschen",
    signIn: "Anmelden",
    signUp: "Registrieren",
    postSomething: "Etwas posten",
    adminPortal: "Admin-Portal",
    indexPopular: "Beliebte KIs indexieren",
    indexingRunning: "INDEXIERE_MODELLE...",
    recommenderTitle: "KI-Matchmaker: Intelligenter Empfehler",
    recommenderSubtitle: "Lassen Sie unseren kognitiven Filter die besten Tools für künstliche allgemeine Intelligenz für Ihren spezifischen Workflow identifizieren.",
    recommenderPromptLabel: "Was versuchen Sie zu bauen oder zu lösen?",
    recommenderPlaceholder: "Beschreiben Sie Ihr Projekt (z. B. 'Ich möchte ein Voiceover für meine Videos erstellen und Code generieren')",
    recommenderSubmit: "Analysieren & Empfehlen",
    recommenderReset: "Finder zurücksetzen",
    recommenderResultsTitle: "Sehr empfohlene Tools für Sie",
    recommenderNoResults: "Keine passenden Tools gefunden. Versuchen Sie, einen anderen Fokus zu wählen oder andere Kriterien einzugeben.",
    recommenderFocusCode: "Software-Entw.",
    recommenderFocusCreative: "Video & Design",
    recommenderFocusWriting: "Inhalt & Text",
    recommenderFocusProductivity: "Forschung & Büro",
    communitySpotlight: "Community-Spotlight",
    communitySpotlightDesc: "Die beliebtesten Tools nach den Stimmen der Mitglieder",
    mainDirectory: "Hauptverzeichnis",
    mainDirectoryDesc: "Erkunden Sie den vollständig aktualisierten Katalog verifizierter kognitiver Modelle und Dienste",
    allCategories: "Alle Kategorien",
    allTypes: "Alle Typen",
    favoritesOnly: "Nur Favoriten anzeigen",
    comparisonTitle: "Tools vergleichen",
    compareButton: "Vergleichen",
    noToolsFound: "Unter diesen Spezifikationen sind noch keine KI-Tools registriert.",
    recentQueries: "Letzte Suchanfragen",
  }
};
