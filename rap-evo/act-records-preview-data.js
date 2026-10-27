/* Demo data for the records preview (records-v2): three real acts rebuilt from their PDFs (act.rrpActs),
   same section structure as the RAP „Vizualizare act” modal (Date generale from the act, then the configured groups). */
(() => {
  const num = (label) => ({ label, type: "number" });

  const radio = {
    key: "radio",
    label: "Autorizație radio (AAC)",
    act: {
      id: "rrp-radio",
      name: "Autorizația de exploatare a emițătoarelor radio instalate la bordul aeronavei",
      number: "P-0410/2026",
      status: "Valabil",
      tone: "success",
      authority: "Autoritatea Aeronautică Civilă",
      office: "Direcția Navigabilitate și Telecomunicații",
      beneficiary: { name: "S.R.L. „FLY ONE”", person: false, idType: "IDNO", id: "1018600021456" },
      issuedDate: "11 septembrie 2026",
      validFrom: "11 septembrie 2026",
      validUntil: "Cât timp este valabil certificatul de navigabilitate al aeronavei"
    },
    groups: [
      {
        title: "Date despre aeronavă",
        fields: [
          { label: "Tipul aeronavei", value: "A321-231" },
          { label: "Numărul de fabricare", value: "05099" },
          { label: "Însemnul de naționalitate și înregistrare", value: "ER-00015" },
          { label: "Beneficiar (adresa)", value: "Republica Moldova, mun. Chișinău, sec. Botanica, bd. Dacia, 80/3, MD-2026" }
        ]
      },
      {
        title: "Emițătoare radio autorizate",
        fields: [
          {
            label: "Echipamente radio",
            columns: ["Denumire", num("Puterea de emisie, W"), "Frecvențele", "Destinația"],
            rows: [
              ["VHF TRANSEIVER COLLINS AEROSPACE „VHF-2100” – 2 unități", "25", "118,000 – 136,975 MHz (8,33 kHz)", "EN-ROUTE COMMUNICATION"],
              ["VHF TRANSEIVER COLLINS AEROSPACE „VHF-920”", "25", "118,000 – 136,975 MHz (8,33 kHz)", "EN-ROUTE COMMUNICATION"],
              ["HF TRANSEIVER COLLINS AEROSPACE „XFS-900D”", "400", "2,0000 – 29,9999 MHz", "EN-ROUTE COMMUNICATION"],
              ["RADIOALTIMETER THALES „ERT-530” – 2 unități", "200 mW", "4200 – 4400 MHz", "ALTITUDE DETERMINATION"],
              ["WEATHER RADAR COLLINS AEROSPACE „WRT-2100” – 2 unități", "150", "9375 MHz", "RADAR DATA"],
              ["T3CAS COMPUTER ACSS (Change 7.1)", "540", "1030 MHz", "TA & RA"],
              ["TRANSPONDER ACSS „XS-950” (MODE S)", "500", "1090 MHz", "IDENTIFICATION"],
              ["DME INTERROGATOR COLLINS AEROSPACE „DME–900” – 2 unități", "800", "1025 – 1150 MHz", "RANGING"],
              ["ELT OROLIA S.A.S. „KANNAD 406 S”", "100 mW; 5", "121,5; 243,0; 406,0 MHz", "EMERGENCY COMMUNICATION"],
              ["ELT OROLIA S.A.S. „KANNAD 406 AF”", "100 mW; 5", "121,5; 243,0; 406,0 MHz", "EMERGENCY COMMUNICATION"]
            ]
          }
        ]
      },
      {
        title: "Valabilitatea autorizației",
        fields: [
          { label: "Valabilitatea", value: "Prezenta autorizație este considerată valabilă atât timp cât este valabil certificatul de navigabilitate al aeronavei." },
          { label: "Semnat de", value: "Director, semnat electronic (MoldSign)" }
        ]
      }
    ]
  };

  const heads = [
    ["Găgăuzia, mun. Ceadîr-Lunga, str. Miciurin, 13/1", "Pamujac Liudmila", "I", "farmaciei de forme industriale"],
    ["Găgăuzia, mun. Ceadîr-Lunga, Goriki, 2, nr. 1", "Boghiu Anastasia", "I", "farmaciei de forme industriale"],
    ["mun. Chișinău, Șoseaua Hînceşti, 60/4", "Turcanu Cristina", "I", "farmaciei cu funcție de producere"],
    ["r-nul Criuleni, or. Criuleni, str. 31 August 1989, 68", "Birlad Valentina", "I", "farmaciei de forme industriale"],
    ["r-nul Cimișlia, or. Cimișlia, str. Barbu Lăutaru, 1/1", "Custovschi Zinaida", "I", "farmaciei cu funcție de producere"],
    ["mun. Chișinău, sec. Rîșcani, str. Tudor Vladimirescu, 10/1", "Stepanov Valeria", "I", "farmaciei de forme industriale"],
    ["r-nul Briceni, or. Lipcani, str. Mihail Frunze, 3", "Croitor Tatiana", "I", "farmaciei de forme industriale"],
    ["mun. Chișinău, str. Spicului, 6", "Pleșca Elena", "I", "farmaciei cu funcție de producere"],
    ["r-nul Soroca, mun. Soroca, str. Renașterii, 106", "Dabija Natalia", "I", "farmaciei de forme industriale"],
    ["r-nul Briceni, or. Briceni, str. Independenței, 10", "Nastas Ruxandra", "I", "farmaciei de forme industriale"],
    ["r-nul Nisporeni, or. Nisporeni, str. Toma Ciorbă, 15", "Luchianenco Tatiana", "I", "farmaciei de forme industriale"],
    ["mun. Chișinău, str. Independenței, 24/4", "Purice Natalia", "I", "farmaciei cu funcție de producere"],
    ["r-nul Ialoveni, or. Ialoveni, str. Alexandru cel Bun, 31", "Vrabie Tatiana", "I", "farmaciei de forme industriale"],
    ["mun. Chișinău, s. Budești, str. Chișinău, 1/J, nr. 2", "Racovcena Irina", "I", "farmaciei de forme industriale"],
    ["r-nul Orhei, s. Susleni", "Zagaican Victoria", "I", "farmaciei de forme industriale"],
    ["r-nul Cantemir, or. Cantemir, str. Ștefan Vodă, 44", "Darciuc Marta", "I", "farmaciei de forme industriale"]
  ];
  const exception = "Cu excepția dreptului de activitate cu substanțe stupefiante, psihotrope și precursori";

  const conditions = [
    ["a", "Înregistrarea în registrul de stat al persoanelor juridice cu respectarea tuturor dispozițiilor pentru persoane juridice prevăzute de: Capitolul II, PERSOANA JURIDICĂ, COD nr. 1107/2002, CODULUI CIVIL al Republicii Moldova; Legea nr. 845/1992 cu privire la antreprenoriat și întreprinderi; Legea nr. 220/2007 privind înregistrarea de stat a persoanelor juridice și a întreprinzătorilor individuali."],
    ["b", "Desfășurarea activității licențiate în conformitate cu cadrul legislativ și normativ (Legea nr. 160 din 22.07.2011 privind reglementarea prin autorizare a activității de întreprinzător; Legea nr. 1456 din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["c", "Respectarea regulilor și normativelor privind spațiul, amplasarea și dotarea încăperilor unității farmaceutice, regimului sanitaro-epidemiologic și a securității antiincendiare: Hotărârea Guvernului nr. 504/2012 pentru aprobarea Regulamentului sanitar privind dotarea și exploatarea farmaciilor și depozitelor farmaceutice; Art. 7 din Legea nr. 845/1992 cu privire la antreprenoriat și întreprinderi; Art. 10 lit. a) și art. 20 alin. (4) din Legea nr. 1513/1993 privind asigurarea sanitaro-epidemiologică a populației."],
    ["d", "Asistența cu medicamente de bună calitate. Medicamentele și produsele parafarmaceutice eliberate populației trebuie să corespundă cerințelor Farmacopeei sau altei documentații tehnico-normative aprobate de Ministerul Sănătății (Art. 18 alin. (3) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["e", "Neadmiterea producerii, depozitării și comercializării medicamentelor falsificate (contrafăcute) și cu termenul de valabilitate expirat (Art. 6 alin. (4) și (7) al Legii nr. 105-XV din 13.03.2003 privind protecția consumatorilor)."],
    ["f", "Respectarea cerințelor de formare a prețurilor la medicamente, alte produse farmaceutice (Art. 20 alin. (1) și (2) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică; Hotărîrea Guvernului nr. 603 din 02.07.1997 despre aprobarea Regulamentului privind formarea prețurilor la medicamente, articole de uz medical și alte produse farmaceutice)."],
    ["g", "Eliberarea substanțelor stupefiante și psihotrope pentru consum individual numai cu rețete medicale speciale (Art. 15 alin. (1) al Legii nr. 382-XIV din 06.05.1999 cu privire la circulația substanțelor stupefiante, psihotrope și a precursorilor)."],
    ["h", "Neadmiterea conducerii prin cumul a întreprinderii și/sau instituției farmaceutice de către farmacist (diriginte) și laborant-farmacist (șef de filială). Neadmiterea conducerii prin cumul a unității farmaceutice de către farmacist (laborant-farmacist) (Art. 143 lit. e) și Art. 22 alin. (4) ale Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["i", "Exercitarea activității farmaceutice de către specialiști cu studii farmaceutice superioare sau medii și calificarea corespunzătoare cerințelor stabilite de Ministerul Sănătății; în instituțiile medico-sanitare publice din localitățile rurale, în care nu există asistență farmaceutică, activitatea farmaceutică în cadrul filialelor de categoria a II-a ale farmaciilor, ca excepție, poate fi exercitată de lucrători medicali care posedă cunoștințe practice în domeniul farmaceutic (Art. 22 alin. (1) și (2¹) și Art. 27 alin. (1) ale Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["j", "Asigurarea informării consumatorilor în mod complet, corect și precis asupra caracteristicilor produselor farmaceutice, privind calitatea și inofensivitatea medicamentelor (Art. 24 al Legii nr. 105-XV din 13.03.2003 privind protecția consumatorilor, Art. 18 al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["k", "Neadmiterea comercializării medicamentelor fără reflectarea circuitului acestora în sistemul informațional automatizat de evidență a circulației medicamentelor (Art. 20¹ alin. (4) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică; Hotărîrea Guvernului nr. 85 din 25.01.2006 cu privire la implementarea Sistemului informațional automatizat „Nomenclatorul de stat al medicamentelor”)."],
    ["l", "Dispunerea de spații pentru desfășurarea activității licențiate ce le aparțin cu drept de proprietate privată sau în alte spații luate în locațiune, inclusiv ale instituțiilor medico-sanitare publice, cu gen de activitate în domeniul ocrotirii sănătății, care corespund cerințelor actelor legislative și normative în vigoare privind parteneriatul public-privat (Art. 4 alin. (4) al Legii ocrotirii sănătății nr. 411-XIII din 28.03.1995)."],
    ["m", "Respectarea cerințelor tehnice față de încăperile și obiectivele în care se păstrează substanțe stupefiante, psihotrope și/sau precursori (Hotărîrea Guvernului nr. 128 din 06.02.2006 cu privire la aprobarea Cerințelor tehnice față de încăperile și obiectivele în care se păstrează substanțe stupefiante, psihotrope și/sau precursori)."],
    ["n", "Depozitele farmaceutice, farmaciile și filialele acestora sînt conduse numai de farmaciști. Ca excepție, farmaciile și filialele farmaciilor amplasate în localitățile rurale pot fi conduse de laboranți-farmaciști care au calificarea corespunzătoare cerințelor stabilite de Ministerul Sănătății (Art. 22 alin. (2) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["o", "Cetățenii străini și apatrizii care au studii farmaceutice pot exercita activitatea farmaceutică, după echivalarea și recunoașterea documentelor de studii în modul stabilit de lege, în aceleași condiții ca și cetățenii Republicii Moldova (Art. 22 alin. (3) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["p", "Un farmacist (laborant-farmacist) poate să conducă numai o unitate farmaceutică (Art. 22 alin. (4) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["q", "Instituțiile și întreprinderile farmaceutice de stat și private, în mod obligatoriu, drept temei pentru desfășurarea activității farmaceutice servesc licența, eliberată conform prevederilor Legii nr. 160/2011 privind reglementarea prin autorizare a activității de întreprinzător și conform normelor speciale, și certificatul privind conformitatea cu bunele practici de fabricație a medicamentelor de uz uman (Good Manufacturing Practice), certificatul privind conformitatea cu bunele practici de distribuție a medicamentelor de uz uman (Good Distribution Practice) sau certificatul privind conformitatea cu buna practică de farmacie (Good Pharmacy Practice), denumite certificate privind conformitatea cu bunele practici (Art. 14¹ alin. (2) din Legea nr. 1456/1993 cu privire la activitatea farmaceutică)."],
    ["r", "Distribuirea angro a medicamentelor se efectuează prin intermediul întreprinderilor autohtone de producție farmaceutică, laboratoarelor de microproducție și depozitelor farmaceutice care dețin licența respectivă, eliberată în conformitate cu legislația în vigoare (Art. 20¹ alin. (2) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["s", "Distribuirea cu amănuntul a medicamentelor se efectuează prin intermediul farmaciilor comunitare care dețin licența respectivă, eliberată în conformitate cu legislația în vigoare (Art. 20¹ alin. (3) al Legii nr. 1456-XII din 25.05.1993 cu privire la activitatea farmaceutică)."],
    ["t", "Extinderea sau înființarea unei noi farmacii/filiale se efectuează în conformitate cu cerințele normative și condițiile stabilite expres de Art. 19 alin. (4), (5) din Legea nr. 1456/1993 cu privire la activitatea farmaceutică: farmaciile (filialele) nou-fondate vor fi amplasate la o distanță de cel puțin 250 de metri (cale accesibilă) de la farmacia (filiala) existentă și la o distanță de cel puțin 500 de metri (cale accesibilă) de la farmacia existentă cu funcție de preparare a medicamentelor extemporale; în municipii, orașe, centre raionale și alte localități cu statut de oraș o farmacie se înființează la un număr de la 3000 pînă la 4000 de locuitori."],
    ["u", "Licențierea activității farmaceutice în localitățile rurale subvenționate de stat prin derogare de la prevederile art. 14¹ și ale art. 22: condițiile de licențiere a activității farmaceutice în localitățile rurale a cărei desfășurare este subvenționată de stat sunt reglementate de Hotărârea Guvernului 1036/2023 cu privire la aprobarea Regulamentului privind condițiile de licențiere a activității farmaceutice în localitățile rurale a cărei desfășurare este subvenționată de stat (conform Art. 14⁴ din Legea nr. 1456/1993 cu privire la activitatea farmaceutică)."]
  ];

  const farmacie = {
    key: "farmacie",
    label: "Licență farmaceutică (AMDM)",
    act: {
      id: "rrp-farmacie",
      name: "Licența pentru activitatea farmaceutică",
      number: "A MMI 004821",
      status: "Valabil",
      tone: "success",
      authority: "Agenția Medicamentului și Dispozitivelor Medicale",
      office: "Direcția Licențiere și Inspecție Farmaceutică",
      beneficiary: { name: "„FARMACIA FAMILIEI S.R.L.”", person: false, idType: "IDNO", id: "1005600017723" },
      issuedDate: "23 octombrie 2026",
      validFrom: "23 octombrie 2026",
      validUntil: "20 iulie 2030"
    },
    groups: [
      {
        title: "Date despre titularul licenței",
        fields: [
          { label: "Denumirea, forma juridică de organizare", value: "„FARMACIA FAMILIEI S.R.L.”" },
          { label: "Adresa juridică", value: "Republica Moldova, mun. Chișinău, BOTANICA CHIȘINĂU, str. BUREBISTA, 23" },
          { label: "Data adoptării deciziei de înregistrare a titularului de licență", value: "19 aprilie 2005" },
          { label: "Număr de identificare de stat (IDNO)", value: "1005600017723" },
          { label: "Genul de activitate", value: "Activitatea farmaceutică" }
        ]
      },
      {
        title: "Condiții de licențiere",
        fields: [
          { label: "Titularul de licență este obligat să respecte următoarele condiții de licențiere pentru desfășurarea activității", value: "Licența este valabilă numai cu anexa autentificată de autoritatea de licențiere, în care sunt indicate condițiile de licențiere pentru genul de activitate specificat în licență." },
          { label: "Condiții", columns: [{ label: "Literă", type: "short" }, { label: "Cerința", type: "wide" }], rows: conditions, titleColumns: [{ col: 0, prefix: "Condiția " }], numbered: false }
        ]
      },
      {
        title: "Adresa de desfășurare a activității",
        fields: [
          {
            label: "Unități farmaceutice",
            columns: ["Adresa", "Șef de filială", "Categoria filialei", "Excepții"],
            rows: heads.map(([address, head, category, kind]) => [address, head, `Filială de categoria ${category} a ${kind}`, exception])
          }
        ]
      }
    ]
  };

  /* forest grid: nr | parcela | subparcela | parchet | ha | compoziție | consistență | vârstă | tratament | volum
     (row numbers 3, 4, 6, 8 do not exist in the source document — kept as in the PDF) */
  const treat = { P: "Tăieri de produse principale", C: "Tăieri de conservare", R: "Tăieri de reconstrucție ecologică" };
  const forestRows = `
1|5|O|1|2,00|ST2FR2ST5DT1|0,5|98|P|33,00
2|25|E|1|2,00|ST6ST3DT1|0,5|108|P|145,00
5|25|E|4|2,00|ST6ST3DT1|0,5|108|P|85,00
7|25|Q|1|2,00|ST8GO1DT1|0,4|108|P|65,00
9|34|D|1|1,40|GO2GO2ST2ST1DT1GO1ST10|0,5|116|P|86,00
10|34|M|1|2,00|GO3GO1ST1FR2DT1GO2|0,5|116|P|74,00
11|34|M|2|2,00|GO3GO1ST1FR2DT1GO2|0,5|116|P|38,00
12|34|M|3|2,00|GO3GO1ST1FR2DT1GO2|0,5|116|P|58,00
13|34|M|4|2,00|GO3GO1ST1FR2DT1GO2|0,5|116|P|53,00
14|34|O|1|0,90|ST2ST2GO1GO1FR2ST1GO10|0,5|116|P|83,00
15|4|C|1|2,00|GO1ST2GO2ST1GO1DT1DT2|0,5|100|P|137,00
16|5|L|1|1,40|ST1GO1DT1ST1GO1DT1FR4|0,5|98|P|38,00
17|5|L|2|1,70|ST1GO1DT1ST1GO1DT1FR4|0,5|98|P|116,00
18|34|O|2|1,00|ST2ST2GO1GO1FR2ST1GO10|0,5|116|P|46,00
19|41|R|1|2,00|GO5GO5|0,4|113|P|88,00
20|26|X|1|0,80|SA3PLA1ARA4FR1DT1|0,7|33|P|87,00
21|22|W|1|0,60|ULC4PLA3SC2DT1|0,7|50|P|30,00
22|23|O|1|1,00|PIN4ULC1SC3AR2|0,5|60|P|36,00
23|46|O|1|1,00|FR8ST2|0,4|83|P|89,00
24|6|G|1|1,00|PA4SC3DT1VIT2|0,5|45|C|62,00
25|7|B|1|0,50|PIN6SC3DT1|0,7|45|C|15,00
26|39|D|1|1,00|CD3SC2SC4DT1|0,5|28|C|13,00
27|44|F|1|0,40|FR10|0,3|83|C|22,00
28|46|V|1|0,50|ST10|0,4|98|C|62,00
29|47|E|1|1,00|ST10|0,4|103|C|237,00
30|48|M|1|1,00|ST4ST6|0,3|108|C|50,00
31|57|D|1|1,10|ME10|0,7|55|C|102,00
32|57|D|2|1,00|ME10|0,7|55|C|31,00
33|67|S|1|1,00|ME3SA2TE4SC1|0,2|55|C|39,00
34|10|A|1|0,50|SC9DT10|0,8|23|C|56,00
35|22|U|1|0,30|ULC5SC4DT1|0,4|60|C|18,00
36|23|K|1|0,30|SC3ULC3PIN3DT1|0,6|40|C|33,00
37|38|B|1|1,10|SC7FRA2DT1|0,7|26|C|57,00
38|38|B|2|1,00|SC7FRA2DT1|0,7|26|C|62,00
39|38|B|3|1,00|SC7FRA2DT1|0,7|26|C|51,00
40|38|B|4|0,40|SC7FRA2DT1|0,7|26|C|14,00
41|38|D|1|1,00|SC9ULC10|0,7|20|C|33,00
42|39|O|1|0,50|CI2NU2CD2PR2SC2|0,6|23|C|5,00
43|52|O|1|0,90|SC10|0,8|20|C|74,00
44|52|O|2|0,60|SC10|0,8|20|C|59,00
45|58|A|1|0,60|PLN5SA4DT1|0,7|45|C|100,00
46|58|L|1|0,70|SC9DT10|0,8|20|C|34,00
47|58|L|2|0,50|SC9DT10|0,8|20|C|46,00
48|61|D|1|0,20|GL4SC2SC3ARA1|0,5|48|C|7,00
49|65|B|1|1,10|SC10|0,7|25|C|22,00
50|65|H|2|0,50|SC10|0,7|30|C|36,00
51|66|B|1|1,00|SC10|0,8|23|C|38,00
52|66|B|2|1,00|SC10|0,8|23|C|19,00
53|66|B|3|1,00|SC10|0,8|23|C|15,00
54|67|P|1|1,00|SC10|0,7|25|C|27,00
55|76|A|1|0,80|SC8SC2|0,6|40|C|43,00
56|76|D|1|0,40|SC8SC2|0,7|40|C|42,00
57|76|D|2|1,00|SC8SC2|0,7|40|C|68,00
58|76|D|3|0,90|SC8SC2|0,7|40|C|75,00
59|7|G|1|0,40|PIN10|0,7|45|C|36,00
60|21|H|1|0,50|ST1ST1JU3JU5|0,3|130|R|51,00
61|18|B|1|1,00|SC9DT10|0,7|30|R|30,00`.trim().split("\n").map((line) => {
    const [nr, parcel, sub, parchet, ha, comp, cons, age, t, vol] = line.split("|");
    return [nr, parcel, sub, parchet, ha, comp, cons, age, "Principale", treat[t], vol];
  });

  const forestier = {
    key: "forestier",
    label: "Autorizație tăieri forestiere (Agenția de Mediu)",
    act: {
      id: "rrp-forestier",
      name: "Autorizația pentru tăieri ale vegetației forestiere",
      number: "P-9341/2026",
      status: "Valabil",
      tone: "success",
      authority: "Agenția de Mediu",
      office: "Direcția autorizații de mediu",
      beneficiary: { name: "AGENȚIA „MOLDSILVA”", person: false, idType: "IDNO", id: "1003600052118" },
      issuedDate: "27 octombrie 2026",
      validFrom: "27 octombrie 2026",
      validUntil: "17 mai 2027"
    },
    groups: [
      {
        title: "Date despre solicitare",
        fields: [
          { label: "Numărul cererii", value: "C632792/2026" },
          { label: "Data cererii", value: "26 octombrie 2026" },
          { label: "Beneficiar (adresa sediului)", value: "Republica Moldova, mun. Chișinău, bd. Ștefan cel Mare și Sfânt, 124, etaj 3" },
          { label: "Documente premergătoare", value: [
            "Cerere nr. C632792/2026 din 26 octombrie 2026",
            "Extras din materialele de amenajare și inventariere a vegetației lemnoase",
            "Reperfectare Autorizație nr. P-9192/2026 din 18 februarie 2026",
            "PV de control IPM Cr. și DB."
          ] }
        ]
      },
      {
        title: "Volumul lucrărilor autorizate",
        fields: [
          { label: "Întreprinderea silvică", value: "ÎS Chișinău, Ocolul silvic Criuleni (TPP)" },
          { label: "Suprafața", value: "58,50 ha" },
          { label: "Volumul masei lemnoase", value: "3.171,0 m³" }
        ]
      },
      {
        title: "Caracteristicile tăierilor",
        fields: [
          {
            label: "Tăieri în fondul forestier / vegetația forestieră din afara fondului forestier",
            columns: [{ label: "Nr. crt.", type: "short" }, { label: "Nr. parcelei", type: "short" }, { label: "Nr. subparcelei", type: "short" }, { label: "Nr. parchetului", type: "short" }, num("Suprafața (ha)"), "Compoziția", num("Consistența"), num("Vârsta (ani)"), "Natura produsului", "Tipul tăierii", num("Volum de extras (m³)")],
            rows: forestRows,
            titleColumns: [{ col: 1, prefix: "Parcela " }, 2, { col: 3, prefix: "parchet " }],
            numberColumn: 0
          },
          { label: "Suprafața totală", value: "58,50 ha" },
          { label: "Volumul total", value: "3.171,00 m³" }
        ]
      },
      {
        title: "Prescripții obligatorii",
        fields: [
          { label: "Prescripția 1", value: "Tratamentul silvic să se efectueze în strictă conformitate cu ATVF eliberată de Agenția de Mediu, în corespundere cu Normele tehnice privind folosirea, conservarea și dezvoltarea pădurilor din RM." },
          { label: "Prescripția 2", value: "Masa lemnoasă obținută, prealabil calculată și indicată în acte, să fie luată la evidența contabilă de către gestionarul funciar al terenului." },
          { label: "Prescripția 3", value: "Beneficiarul actului permisiv de mediu (ATVF) va asigura menținerea bilanțului vegetației forestiere, în strictă conformitate cu prevederile și cerințele actelor legislative și normative ale protecției mediului și cele din domeniul gospodăririi și administrării fondului forestier." },
          { label: "Prescripția 4", value: "Gestionarul terenului va asigura neadmiterea încălcării prevederilor actelor normative și legislative privind gestionarea și protecția fondului forestier, încălcarea regulilor de folosire a obiectelor fondului forestier și cinegetic." }
        ]
      }
    ]
  };

  window.RRP_ACTS = { radio, farmacie, forestier };
})();
