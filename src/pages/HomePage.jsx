import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import React from "react";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const [displayData, setDisplayData] = useState([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data } = await supabase.from("equipment").select(
        `
          name,
          category,
          property,
          in_service_date
        `,
      );
      console.log(data);
      setDisplayData(data || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  }

  // Don't render table until we have data
  if (displayData.length === 0) {
    return <div>Loading...</div>;
  }

  const headers = Object.keys(displayData[0]);

  return (
    <div>
      <Button>Click me</Button>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((item, index) => (
            <tr key={item.id || index}>
              {headers.map((header) => (
                <td key={header}>{item[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
