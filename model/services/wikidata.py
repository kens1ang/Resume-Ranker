import requests
from fastapi import HTTPException
from utils.logging import setup_logger

logger = setup_logger("wikidata-service")

async def fetch_academic_degrees():
    """Fetch a list of academic degrees from Wikidata."""
    url = "https://query.wikidata.org/sparql"
    
    # The SPARQL query to get academic degrees
    query = """
    SELECT ?discipline ?disciplineLabel WHERE {
      ?discipline wdt:P31 wd:Q11862829. # instance of academic degree
      FILTER(?discipline NOT IN (
      wd:Q100997647, wd:Q101421733, wd:Q102245198, wd:Q10297161, wd:Q10403518, wd:Q104661042,
      wd:Q10472829, wd:Q10474537, wd:Q10480689, wd:Q10541492, wd:Q10543087, wd:Q10543355,
      wd:Q10554132, wd:Q10579236, wd:Q10606998, wd:Q106750491, wd:Q10693106, wd:Q109017688,
      wd:Q109043466, wd:Q109043468, wd:Q109043471, wd:Q109043473, wd:Q109043480, wd:Q109043483,
      wd:Q109043486, wd:Q109043490, wd:Q109043493, wd:Q109043499, wd:Q109043502, wd:Q109043504,
      wd:Q109043506, wd:Q109043508, wd:Q109043510, wd:Q109043512, wd:Q109043514, wd:Q109043516,
      wd:Q109043523, wd:Q109046081, wd:Q109046084, wd:Q109046087, wd:Q109046089, wd:Q109361897,
      wd:Q109969317, wd:Q110613578, wd:Q110613826, wd:Q110614011, wd:Q110966310, wd:Q111210263,
      wd:Q111210498, wd:Q111456914, wd:Q111516745, wd:Q111697204, wd:Q111740805, wd:Q113411101,
      wd:Q114243572, wd:Q11433104, wd:Q115868097, wd:Q11594544, wd:Q116033454, wd:Q11814195,
      wd:Q11814240, wd:Q11873342, wd:Q118976285, wd:Q119171281, wd:Q119262238, wd:Q11965727,
      wd:Q11965830, wd:Q11968240, wd:Q11979277, wd:Q11983053, wd:Q12034894, wd:Q120372749,
      wd:Q121115889, wd:Q12222332, wd:Q122272826, wd:Q1227190, wd:Q1227191, wd:Q1227192,
      wd:Q1227253, wd:Q123019270, wd:Q12305104, wd:Q12305107, wd:Q12305109, wd:Q12305110,
      wd:Q12305112, wd:Q12305113, wd:Q12305116, wd:Q12305117, wd:Q12305118, wd:Q12305119,
      wd:Q12305121, wd:Q12305122, wd:Q12305124, wd:Q12305125, wd:Q12326600, wd:Q12376601,
      wd:Q123777823, wd:Q124250078, wd:Q124346564, wd:Q125883329, wd:Q126711869, wd:Q131142918,
      wd:Q131376620, wd:Q131995099, wd:Q132351101, wd:Q132351181, wd:Q132544664, wd:Q133265884,
      wd:Q133265899, wd:Q133520162, wd:Q133797338, wd:Q133825588, wd:Q133825597, wd:Q133843562,
      wd:Q16323401, wd:Q16324350, wd:Q16530879, wd:Q17482275, wd:Q17622324, wd:Q1772363,
      wd:Q17770319, wd:Q1813373, wd:Q1839832, wd:Q18417522, wd:Q18450389, wd:Q18694269,
      wd:Q1907863, wd:Q19379316, wd:Q19388578, wd:Q19610187, wd:Q19610200, wd:Q19731935,
      wd:Q19731937, wd:Q20067383, wd:Q20067384, wd:Q20067385, wd:Q21014165, wd:Q21572920,
      wd:Q22934301, wd:Q22934317, wd:Q22978132, wd:Q24541494, wd:Q25427627, wd:Q25448174,
      wd:Q25458739, wd:Q26161488, wd:Q27077396, wd:Q27163385, wd:Q28046673, wd:Q28276536,
      wd:Q28280134, wd:Q28763030, wd:Q2946848, wd:Q3029057, wd:Q3029065, wd:Q3029101,
      wd:Q43236300, wd:Q47514955, wd:Q48746355, wd:Q48941152, wd:Q50295717, wd:Q50348784,
      wd:Q50357261, wd:Q50414325, wd:Q50414336, wd:Q50414356, wd:Q50416280, wd:Q50430770,
      wd:Q50433389, wd:Q50433457, wd:Q50524205, wd:Q50851921, wd:Q52687813, wd:Q55772728,
      wd:Q56324663, wd:Q56706577, wd:Q56706592, wd:Q59389138, wd:Q60172326, wd:Q6154512,
      wd:Q64402434, wd:Q65229493, wd:Q65393828, wd:Q67146338, wd:Q67146716, wd:Q72063862,
      wd:Q72317748, wd:Q80007435, wd:Q8201922, wd:Q82029193, wd:Q84824036, wd:Q87383747,
      wd:Q8772636, wd:Q8964831, wd:Q91106023, wd:Q95564761, wd:Q96274103, wd:Q96633883,
      wd:Q97662173, wd:Q98427619, wd:Q99228297))
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY ?disciplineLabel
    """
    
    headers = {"Accept": "application/json"}
    
    try:
        response = requests.get(url, params={"query": query}, headers=headers, timeout=10)
        
        if response.status_code == 200:
            results = response.json().get("results", {}).get("bindings", [])
            
            # Extract degree labels and their corresponding Wikidata IDs
            degree_items = [(item["discipline"]["value"], item["disciplineLabel"]["value"]) for item in results]
            
            # Create a dictionary to store unique degrees with their IDs
            unique_degrees = {}
            for item_id, label in degree_items:
                # Prefer simpler Wikidata entities
                if label not in unique_degrees or len(item_id) < len(unique_degrees[label]):
                    unique_degrees[label] = item_id
            
            # Convert back to a sorted list of just the degree names
            degrees = sorted(unique_degrees.keys())
            
            logger.info(f"Fetched {len(degrees)} unique degrees from Wikidata")
            return degrees
            
        else:
            logger.error(f"Wikidata query failed with status code: {response.status_code}")
            raise HTTPException(status_code=response.status_code, 
                               detail="Error fetching degrees from Wikidata")
                               
    except Exception as e:
        logger.error(f"Exception during Wikidata query: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching degrees: {str(e)}")