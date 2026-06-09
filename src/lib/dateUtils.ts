export const getTodayDate = () => new Date().toISOString().split("T")[0];

export const getFormattedDate = () => {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};
