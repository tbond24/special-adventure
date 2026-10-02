(() => {
  const labels = {
    'Listing language':['房源语言','Langue de l’annonce','Lugha ya tangazo'],
    'Room':['房间','Chambre','Chumba'],
    'Unit 1':['单元 1','Logement 1','Sehemu 1'],
    'Duplicate unit':['复制单元','Dupliquer le logement','Nakili sehemu'],
    'Optional':['可选','Facultatif','Si lazima'],
    'Choose a point to look up its address.':['在地图上选择地点以查找地址。','Choisissez un point sur la carte pour trouver son adresse.','Chagua sehemu kwenye ramani ili kupata anwani.'],
    'State':['州／省','Région','Mkoa'],
    'County':['县','Comté','Kaunti'],
    'City':['城市','Ville','Jiji'],
    'Town / city':['城镇／城市','Ville','Mji / jiji'],
    'Suburb':['街区','Quartier','Mtaa'],
    'Estate / area':['小区／区域','Quartier / zone','Mtaa / eneo'],
    'Nearby landmark':['附近地标','Point de repère proche','Alama ya karibu'],
    'Postcode (optional)':['邮编（可选）','Code postal (facultatif)','Msimbo wa posta (si lazima)'],
    'Exact address / directions':['详细地址／路线','Adresse exacte / indications','Anwani kamili / maelekezo'],
    'Kept private from public search.':['不会公开显示。','Non visible dans la recherche publique.','Haionyeshwi kwenye utafutaji wa umma.'],
    'Review listing':['检查房源','Vérifier l’annonce','Hakiki tangazo'],
    'Copy into this property':['复制到此物业','Copier dans ce bien','Nakili kwenye nyumba hii'],
    'Delete unit':['删除单元','Supprimer le logement','Futa sehemu'],
    'Property notes':['物业备注','Notes sur le bien','Maelezo ya nyumba'],
    'Maximum occupants':['最多入住人数','Nombre maximal d’occupants','Idadi ya juu ya wakazi'],
    'Minimum stay (weeks)':['最短租期（周）','Séjour minimum (semaines)','Muda wa chini (wiki)'],
    'Photos':['照片','Photos','Picha'],
    'Add photos':['添加照片','Ajouter des photos','Ongeza picha'],
    'Preview listing':['预览房源','Aperçu de l’annonce','Hakiki tangazo'],
    'Save draft':['保存草稿','Enregistrer le brouillon','Hifadhi rasimu'],
    'Property details':['物业详情','Détails du bien','Maelezo ya nyumba'],
    'Unit type':['单元类型','Type de logement','Aina ya sehemu'],
    'Unit & availability':['单元与入住日期','Logement et disponibilité','Sehemu na upatikanaji'],
    'Search other currencies…':['搜索其他货币…','Chercher une autre devise…','Tafuta sarafu nyingine…'],
    'Search currency code':['搜索货币代码','Chercher un code de devise','Tafuta msimbo wa sarafu'],
    'Cancel':['取消','Annuler','Ghairi'],
    'Complete your listing':['完成房源发布','Compléter votre annonce','Kamilisha tangazo lako'],
    'What are you listing?':['您要发布什么？','Que proposez-vous ?','Unatangaza nini?'],
    'Room / apartment':['房间／公寓','Chambre / appartement','Chumba / fleti'],
    'House':['房屋','Maison','Nyumba'],
    'Shop':['商铺','Commerce','Duka'],
    'Other':['其他','Autre','Nyingine'],
    'Studio, 1bdrm, 2brm, more':['单间、一居室、两居室等','Studio, 1 ou 2 chambres et plus','Studio, chumba 1, vyumba 2 na zaidi'],
    'Existing property':['现有物业','Bien existant','Nyumba iliyopo'],
    'New property':['新物业','Nouveau bien','Nyumba mpya'],
    'Location':['位置','Emplacement','Mahali'],
    'Listing details':['房源详情','Détails de l’annonce','Maelezo ya tangazo'],
    'Review':['检查','Vérification','Hakiki'],
    'Continue':['继续','Continuer','Endelea'],
    'Publish vacancy':['发布房源','Publier l’annonce','Chapisha tangazo'],
    'Change':['更改','Modifier','Badilisha'],
    'Current location':['当前位置','Position actuelle','Mahali ulipo'],
    'Property name (optional)':['物业名称（可选）','Nom du bien (facultatif)','Jina la nyumba (si lazima)'],
    'Private manager nickname':['内部名称','Nom interne','Jina la ndani'],
    'Only you see this.':['仅您可见。','Visible uniquement par vous.','Ni wewe pekee unayeona.'],
    'Photos of this unit':['此单元的照片','Photos de ce logement','Picha za sehemu hii'],
    '+ Add media':['＋添加照片','＋ Ajouter des photos','＋ Ongeza picha'],
    'Upload photos':['上传照片','Importer des photos','Pakia picha'],
    'Existing library':['现有图库','Photothèque existante','Maktaba ya picha'],
    'Add at least 3 images.':['至少添加三张照片。','Ajoutez au moins 3 photos.','Ongeza angalau picha 3.'],
    'Listing title':['房源标题','Titre de l’annonce','Kichwa cha tangazo'],
    'Automatic':['自动','Automatique','Otomatiki'],
    'Manual':['手动','Manuel','Weka mwenyewe'],
    'Rent':['租金','Loyer','Kodi'],
    'Deposit':['押金','Dépôt de garantie','Amana'],
    'Available from':['入住日期','Disponible à partir du','Inapatikana kuanzia'],
    'Minimum stay':['最短租期','Séjour minimum','Muda wa chini wa kukaa'],
    'About this unit':['关于此单元','À propos de ce logement','Kuhusu sehemu hii'],
    'Amenities':['设施','Équipements','Vistawishi'],
    'Features':['特色','Caractéristiques','Vipengele'],
    'Utilities':['公共服务','Services publics','Huduma za msingi'],
    'Rules':['规定','Règles','Sheria'],
    'Advanced properties':['高级设置','Paramètres avancés','Mipangilio ya ziada'],
    'Parking spaces':['停车位','Places de stationnement','Nafasi za maegesho'],
    'Furnished':['带家具','Meublé','Ina samani'],
    'Ensuite':['独立卫浴','Salle de bain privée','Bafu la ndani'],
    'Balcony':['阳台','Balcon','Roshani'],
    'Swimming pool access':['游泳池','Accès à la piscine','Bwawa la kuogelea'],
    '+ Add your own feature':['＋添加自定义设施','＋ Ajouter un équipement','＋ Ongeza kipengele'],
    '+ Add a utility':['＋添加公共服务','＋ Ajouter un service','＋ Ongeza huduma'],
    '+ Add a rule':['＋添加规定','＋ Ajouter une règle','＋ Ongeza sheria'],
    '+ Add another unit':['＋添加另一个单元','＋ Ajouter un autre logement','＋ Ongeza sehemu nyingine'],
    'Add a price':['添加价格','Ajoutez un prix','Ongeza bei'],
    'Add photos for this unit':['为此单元添加照片','Ajoutez des photos pour ce logement','Ongeza picha za sehemu hii'],
    'Untitled listing':['未命名房源','Annonce sans titre','Tangazo bila kichwa'],
    'Yes':['是','Oui','Ndiyo'],
    'No':['否','Non','Hapana'],
    'Monthly':['每月','Mensuel','Kwa mwezi'],
    'Weekly':['每周','Hebdomadaire','Kwa wiki'],
    'Nightly':['每晚','Par nuit','Kwa usiku']
  };
  const languages = ['en','zh','fr','sw'];
  const originals = new WeakMap();
  const lastRendered = new WeakMap();
  let language = localStorage.getItem('vacancy-listing-language') || 'en';
  let activeObserver;
  function translate(host) {
    if (!host) return;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('script,style,textarea,option, .unit-name-input, .listing-draft-preview h3')) continue;
      if (!originals.has(node) || (lastRendered.has(node) && node.textContent !== lastRendered.get(node))) originals.set(node, node.textContent);
      const raw = originals.get(node);
      const key = raw.trim();
      const replacement = labels[key]?.[languages.indexOf(language)-1];
      const next = replacement ? raw.replace(key,replacement) : raw;
      lastRendered.set(node,next);
      if (node.textContent !== next) node.textContent = next;
    }
    host.querySelectorAll?.('[data-base-name="rentPeriod"] option').forEach(option=>{
      const base={month:'Monthly',week:'Weekly',night:'Nightly'}[option.value];
      if(base){const next=labels[base]?.[languages.indexOf(language)-1]||base;if(option.textContent!==next)option.textContent=next}
    });
    host.setAttribute('lang',language);
  }
  function install() {
    const host = document.querySelector('#listingHost');
    if (!host || !host.querySelector('.listing-start') || host.querySelector('.listing-language')) return;
    activeObserver?.disconnect();
    const picker = document.createElement('label');
    picker.className = 'listing-language';
    picker.innerHTML = '<span class="sr-only">Listing language</span><select aria-label="Listing language"><option value="en">English</option><option value="zh">中文</option><option value="fr">Français</option><option value="sw">Kiswahili</option></select>';
    picker.querySelector('select').value = language;
    picker.querySelector('select').onchange = event => { language=event.target.value;localStorage.setItem('vacancy-listing-language',language);translate(host);translate(document.querySelector('main:has(#listingHost) .section-head h1')) };
    host.prepend(picker);
    const observer = new MutationObserver(() => { translate(host);translate(document.querySelector('main:has(#listingHost) .section-head h1')) });
    observer.observe(host,{childList:true,subtree:true,characterData:true});
    activeObserver = observer;
    translate(host);
    translate(document.querySelector('main:has(#listingHost) .section-head h1'));
  }
  const previous = renderList;
  renderList = async function (...args) { const result=await previous.apply(this,args);install();return result };
  const previousEdit = renderEdit;
  renderEdit = async function (...args) { const result=await previousEdit.apply(this,args);install();return result };
})();
