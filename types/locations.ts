export interface Country {
  code: string
  name: string
  states: State[]
}

export interface State {
  code: string
  name: string
  country: string
}

export const LOCATIONS: Country[] = [
  {
    code: "US",
    name: "United States",
    states: [
      { code: "AL", name: "Alabama", country: "US" },
      { code: "AK", name: "Alaska", country: "US" },
      { code: "AZ", name: "Arizona", country: "US" },
      { code: "AR", name: "Arkansas", country: "US" },
      { code: "CA", name: "California", country: "US" },
      { code: "CO", name: "Colorado", country: "US" },
      { code: "CT", name: "Connecticut", country: "US" },
      { code: "DE", name: "Delaware", country: "US" },
      { code: "FL", name: "Florida", country: "US" },
      { code: "GA", name: "Georgia", country: "US" },
      { code: "HI", name: "Hawaii", country: "US" },
      { code: "ID", name: "Idaho", country: "US" },
      { code: "IL", name: "Illinois", country: "US" },
      { code: "IN", name: "Indiana", country: "US" },
      { code: "IA", name: "Iowa", country: "US" },
      { code: "KS", name: "Kansas", country: "US" },
      { code: "KY", name: "Kentucky", country: "US" },
      { code: "LA", name: "Louisiana", country: "US" },
      { code: "ME", name: "Maine", country: "US" },
      { code: "MD", name: "Maryland", country: "US" },
      { code: "MA", name: "Massachusetts", country: "US" },
      { code: "MI", name: "Michigan", country: "US" },
      { code: "MN", name: "Minnesota", country: "US" },
      { code: "MS", name: "Mississippi", country: "US" },
      { code: "MO", name: "Missouri", country: "US" },
      { code: "MT", name: "Montana", country: "US" },
      { code: "NE", name: "Nebraska", country: "US" },
      { code: "NV", name: "Nevada", country: "US" },
      { code: "NH", name: "New Hampshire", country: "US" },
      { code: "NJ", name: "New Jersey", country: "US" },
      { code: "NM", name: "New Mexico", country: "US" },
      { code: "NY", name: "New York", country: "US" },
      { code: "NC", name: "North Carolina", country: "US" },
      { code: "ND", name: "North Dakota", country: "US" },
      { code: "OH", name: "Ohio", country: "US" },
      { code: "OK", name: "Oklahoma", country: "US" },
      { code: "OR", name: "Oregon", country: "US" },
      { code: "PA", name: "Pennsylvania", country: "US" },
      { code: "RI", name: "Rhode Island", country: "US" },
      { code: "SC", name: "South Carolina", country: "US" },
      { code: "SD", name: "South Dakota", country: "US" },
      { code: "TN", name: "Tennessee", country: "US" },
      { code: "TX", name: "Texas", country: "US" },
      { code: "UT", name: "Utah", country: "US" },
      { code: "VT", name: "Vermont", country: "US" },
      { code: "VA", name: "Virginia", country: "US" },
      { code: "WA", name: "Washington", country: "US" },
      { code: "WV", name: "West Virginia", country: "US" },
      { code: "WI", name: "Wisconsin", country: "US" },
      { code: "WY", name: "Wyoming", country: "US" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    states: [
      { code: "AB", name: "Alberta", country: "CA" },
      { code: "BC", name: "British Columbia", country: "CA" },
      { code: "MB", name: "Manitoba", country: "CA" },
      { code: "NB", name: "New Brunswick", country: "CA" },
      { code: "NL", name: "Newfoundland and Labrador", country: "CA" },
      { code: "NS", name: "Nova Scotia", country: "CA" },
      { code: "ON", name: "Ontario", country: "CA" },
      { code: "PE", name: "Prince Edward Island", country: "CA" },
      { code: "QC", name: "Quebec", country: "CA" },
      { code: "SK", name: "Saskatchewan", country: "CA" },
      { code: "NT", name: "Northwest Territories", country: "CA" },
      { code: "NU", name: "Nunavut", country: "CA" },
      { code: "YT", name: "Yukon", country: "CA" },
    ],
  },
]
