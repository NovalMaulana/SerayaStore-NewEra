import { useState, useEffect, useRef } from 'react';

function Navbar({ onWebhookSelect, onNewChat, onDelayChange, currentDelay }) {
  const [isWebhookDropdownOpen, setIsWebhookDropdownOpen] = useState(false);
  const [isDelayDropdownOpen, setIsDelayDropdownOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState('Select Webhook');
  const [searchQuery, setSearchQuery] = useState('');

  const webhooks = [
    { id: 1, name: 'Testing Website', url: 'https://discord.com/api/webhooks/1346700930338258945/WiBw1PV0SX_Y8j30I7BMfGVaqwW1MjtojFjhjPdO2rriK2a9Pyy61PWGAH6oR7U-pOou', category: 'Testing' },

    { id: 2, name: 'Feni', url: 'https://discord.com/api/webhooks/1239113110757838909/4LV2rSKeAKuTAvaNQU-qYzOd7WdjRtf1qwmLykefZ6WxiWOrnzdhwjyDBY-6QngasKg_', category: 'Generation 3' },
    { id: 3, name: 'Gracia', url: 'https://discord.com/api/webhooks/1239114098294394940/rOcMeGd_C5_eVltHUVqMIIZM178kL4Yd0cEAYt-hcqrZsFpcyHhuDiv8VF8I34vtXwCd', category: 'Generation 3' },

    { id: 4, name: 'Gita', url: 'https://discord.com/api/webhooks/1239113789274718280/iymXG2FVhYTS84H7Q2f_W6JNI8uleHWEs43PNwA1AjSh4xyuVIAOEqr8AZg0FpUm_WUl', category: 'Generation 6' },

    { id: 5, name: 'Christy', url: 'https://discord.com/api/webhooks/1239111998860431410/8nqojNywJUCYaXxPU5e7lMD5ui8WgOc6S524_J_7_SGny3JcfQ9uQWrfCOtdv9sZd5lI', category: 'Generation 7' },
    { id: 6, name: 'Eli', url: 'https://discord.com/api/webhooks/1239112668070281277/jXB8KmEu-zLnammMvuJbkchCotujBjNNJUbk5cUPv6-8EFZVROQ1KvM-G6MWxaTCdog1', category: 'Generation 7' },
    { id: 7, name: 'Freya', url: 'https://discord.com/api/webhooks/1239113553743577169/b_0rUeceQBbvh-4sRE5x0dCxPFBx0V59aMawRrfIZfyBWpw7iL0DTm7j80Q-b5GgBvJ7', category: 'Generation 7' },
    { id: 8, name: 'Jessi', url: 'https://discord.com/api/webhooks/1239117376612466719/B0R9s4Of_gg2GUkHlRF0-ZzHWTZIe_cufRrNSToR8eBl2PItniWXIO40CA-nCwxfrIh6', category: 'Generation 7' },
    { id: 9, name: 'Muthe', url: 'https://discord.com/api/webhooks/1239118022652727326/T6C3Lydu2uL0akT-dfUH7-LYzadeDLpbt5fOyLd56zoEp67Q70heh4ETquJOVOGN88mt', category: 'Generation 7' },
    { id: 10, name: 'Olla', url: 'https://discord.com/api/webhooks/1239118024406208544/tJcjlteKdda-p_q8K8WpJ7w_Ya6bW3Ad9AwwKF0furOIVKtgPGLyNErr2gp-PqeVKDIb', category: 'Generation 7' },
    
    { id: 11, name: 'Fiony', url: 'https://discord.com/api/webhooks/1239113317037899806/ip-QnUqZcx6XbjxSZYAhJAqX69avW97LsxsF7tLc3ZlED-rQ1-eqqPxTWRKwIbaX2s0k', category: 'Generation 8' },
    { id: 12, name: 'Lulu', url: 'https://discord.com/api/webhooks/1239117382497210488/VHt4eRdgKM5k6FyLWx2MHbgFMOLbOE7xRCO7AbJIdxNp-b1qkqqYiX3WwWXbhCXFHCC7', category: 'Generation 8' },
    { id: 13, name: 'Oniel', url: 'https://discord.com/api/webhooks/1239118026041987102/ZQQF_YzhzWflONHr509OdU02C-awEDmiA3dRQRMaB_ct5xycNKFA17_gcyiMzyzKo7-m', category: 'Generation 8' },
    
    { id: 14, name: 'Indah', url: 'https://discord.com/api/webhooks/1239116569640960063/XYpPaKRt_jjUkCwm9WzPJupDMvKPvCZEk2mrASs3KGQqCVLqTq4JGWwYkSekKbBZj4V4', category: 'Generation 9' },
    { id: 15, name: 'Kathrina', url: 'https://discord.com/api/webhooks/1239117378751696926/PgvuA0AS84o02y7T2seUl2aUZwdofCqFPROmEmmW1wIF6Y4pq3sTCE6DYqCe1Xnc1jvl', category: 'Generation 9' },
    { id: 16, name: 'Marsha', url: 'https://discord.com/api/webhooks/1239118019947528192/QvEcxIuuF80Zr0iWY7Uqf6gLw4RMd5Cu_I6TngaBnuG_MkVZxxJI35ejwx9N7QwvY2BC', category: 'Generation 9' },
    
    { id: 17, name: 'Amanda', url: 'https://discord.com/api/webhooks/1239111339759239219/J3Wquc_-B3E1xPQWg-2BnD1rJoNxhKI_PLNYzwz_0pfLPPajuVroHQaM3Jw_cwEivbLE', category: 'Generation 10' },
    { id: 18, name: 'Ella', url: 'https://discord.com/api/webhooks/1239112928821514260/gXUKFG0XgNoPHhL3lVAnrf3rJ92oMmOrYp8StmfrUQ2a0JbEF6kAU-LjzUW34iGHjABh', category: 'Generation 10' },
    { id: 19, name: 'Indira', url: 'https://discord.com/api/webhooks/1239116603463831552/0ggtQ_BVpp1_KK0N2aIxZQwCNByduhNhmNAGI3aed_nmyXhK-yK9922-rYOSMMbroI7s', category: 'Generation 10' },
    { id: 20, name: 'Lia', url: 'https://discord.com/api/webhooks/1239117380538466364/eNyYL8aZpDtFF5NjnsFSIVNYrjxnEQ5-amWmQlWt_dnSXVtyZXkgKm_tBm_XQgz4EKJP', category: 'Generation 10' },
    { id: 21, name: 'Lyn', url: 'https://discord.com/api/webhooks/1239118014390079508/oPx0HZhvYAs0llfJhopAXwIf9BgwOkozbmaMAPtDafNm6tMhynH1UG6MFf3JLEOF1Apf', category: 'Generation 10' },
    { id: 22, name: 'Raisha', url: 'https://discord.com/api/webhooks/1239122633736327269/VbNwr0UvMIjlgwK0VlnMZFUdTtJkNzNJs7bcCQWrD-QAG78I1g1dc60JyqEzM7TW5-2U', category: 'Generation 10' },
    
    { id: 23, name: 'Alya', url: 'https://discord.com/api/webhooks/1327301945383321671/3xuGMLUip1pVctkUKKS3yuhvajb6tw296CAEvkCPoJU_s5LGoXVcZlyJgdX3KZ3pKx05', category: 'Generation 11' },
    { id: 24, name: 'Anindya', url: 'https://discord.com/api/webhooks/1239111454620254219/WLLXqGbV9NtnBGuK00T9Yx0zRIvg3WG-uI2hhl2S-gGE6se9fdQKnGBPoIY-kqe9LOfx', category: 'Generation 11' },
    { id: 25, name: 'Cathy', url: 'https://discord.com/api/webhooks/1239111741565042688/vrZA0IjzLv0DOVDGRGwUikQmUGp4WegIEVCXoDxiRGmR4DAhNcAdv8EE5q4BkqLNRgk1', category: 'Generation 11' },
    { id: 26, name: 'Chelsea', url: 'https://discord.com/api/webhooks/1239111875426385980/m1_MP2uT-fOUfumf2q-ALlYK4ewsA2-Tyu4czehzdioFTQKD2UHVCkKIvZc5OB7jkGoZ', category: 'Generation 11' },
    { id: 27, name: 'Cynthia', url: 'https://discord.com/api/webhooks/1239112180150833172/k2kVkgJ0oD1cOErKzG5ruxv6La3G3wtcn0osRE_XuVzuVlg0xqvsMo6DQw0xoRC-2MAB', category: 'Generation 11' },
    { id: 28, name: 'Daisy', url: 'https://discord.com/api/webhooks/1239112311738990663/q1PWqm9oY-KRV6ee948nhJHx-xGW6R32z_2b95WGCJDJfNFPzXZuV6GIaKzsuLlwEi5B', category: 'Generation 11' },
    { id: 29, name: 'Danella', url: 'https://discord.com/api/webhooks/1239112452428533820/DS6o6aCnc1g0B_XU_4SU8WJ957JNI-4yKe1BBqhd44ys159i8gVi45rXznblirJPl-xQ', category: 'Generation 11' },
    { id: 30, name: 'Elin', url: 'https://discord.com/api/webhooks/1239112799297474561/MqZ9iTFSYtuEOdxbLS4G_JLDiejsbR7eLLp0_5QmbfGSFA5YG4uiJOmC7TqD2VBF34kS', category: 'Generation 11' },
    { id: 31, name: 'Gendis', url: 'https://discord.com/api/webhooks/1239113647335411836/qH0a6jEgDB_SVz9s5pWlxYH92fE8PTMrawKLETzA9E2TALsrgmEesiVw09KillZbx8mp', category: 'Generation 11' },
    { id: 32, name: 'Gracie', url: 'https://discord.com/api/webhooks/1239116561139241000/gEI_o6LpG3WzdQs_Hm_XU37jFtDrO8YW0OTaFyUO5vRoSB62_e2Uub9wUWl-67yYrwrq', category: 'Generation 11' },
    { id: 33, name: 'Greesel', url: 'https://discord.com/api/webhooks/1239116567707521054/ZKpHeg1HqD4vMClB6PI0T_9IKi68Ed503iynAv2NUfhaQMLTuqDOxFRCt4lQT2JPOn9-', category: 'Generation 11' },
    { id: 34, name: 'Michie', url: 'https://discord.com/api/webhooks/1239118020920737845/X9jroJFbbt5P3X1k-Cb2Km5XitaoGIW_Uayfcv0To5ZV3wiLj10rI-h3MLdyycfVNHJz', category: 'Generation 11' },
    
    { id: 35, name: 'Aralie', url: 'https://discord.com/api/webhooks/1298526014804197386/Gmxnyxe0Vob5T5cp8r4XSQAQba3fv5LB5szRmi-mPUbpakcTj0l0o2L4Bvo4809KxyN1', category: 'Generation 12' },
    { id: 36, name: 'Delynn', url: 'https://discord.com/api/webhooks/1298526550601371649/7XrgZqfMu6epSnpemN2Q42jw7wEyxQS3_jDWkTy6_yTDUgSuWOLdjnIpCGuD4iV4pJLV', category: 'Generation 12' },
    { id: 37, name: 'Erine', url: 'https://discord.com/api/webhooks/1298354149842489405/l2c4sbCao_RvG-avzVZ7zkOxyF3c21YNkyXX1gFsni_YGfyWF36oIYI1KrY9AxXmBBZX', category: 'Generation 12' },
    { id: 38, name: 'Fritzy', url: 'https://discord.com/api/webhooks/1298527062914498590/HOOtCxJwR7Fsp3XTueu0WwLWxkZvRu2aq4qj3sFu3FpPJwiEESnOTVdYLlvcTEdg-a5I', category: 'Generation 12' },
    { id: 39, name: 'Kimmy', url: 'https://discord.com/api/webhooks/1298529298621268039/wbDhmEdlrp49ysKA7hk8kJO11FDcBbClSjnSuP7_ublo0Y2f6cD-4K2v0bP0lJ8owfQk', category: 'Generation 12' },
    { id: 40, name: 'Lana', url: 'https://discord.com/api/webhooks/1298526729907867731/j63FbAwY4liZ3LJHynxVk9CQzrBrc5rDk4EblMnY6F1boPclT1HdgTxkmZnFVI6PlY4k', category: 'Generation 12' },
    { id: 41, name: 'Levi', url: 'https://discord.com/api/webhooks/1298527849803681862/zxH1gl8HmrlTQU3-TZQ7n4KYLF-GFgu3UfiwYK3VnNm1R1y3yVrDgAHD92a0hOWBLGYP', category: 'Generation 12' },
    { id: 42, name: 'Lily', url: 'https://discord.com/api/webhooks/1298527209119682600/I4CRNgj3eH_vzWzKO3Lq-uGFGtkj1Cq_4zR9qOJs9p3Ts6ziLngHLD-wt-rapYLB7NHr', category: 'Generation 12' },
    { id: 43, name: 'Moreen', url: 'https://discord.com/api/webhooks/1298527653644599359/kRa7GoF7X92hOc4v7H6iuLyCytrPVpaDVKszaulvwMXnk_tGhEeAVA-d30mUSk-jH2c0', category: 'Generation 12' },
    { id: 44, name: 'Nala', url: 'https://discord.com/api/webhooks/1298529076948111360/KuXiWbgNvTuIfQGu9GFhZT4Nqkk3b_OorMyvoX1BPxPTeWre0yckAfyQeQwwQdifL1Sv', category: 'Generation 12' },
    { id: 45, name: 'Nachia', url: 'https://discord.com/api/webhooks/1298528136580829196/7_wFj5NLLwC5DFgDTUSE6fn0YZJPjRBV8qSOQhHhgKuoClAmAXsPS-ePF_CYqqPkkJHi', category: 'Generation 12' },
    { id: 46, name: 'Nayla', url: 'https://discord.com/api/webhooks/1298527996344275006/KAN8_Igq_aUlk2MUevqPsMlquCZOpjUAPi1KFl5gTL15KLTuXov1YYGkAQYIGXBAsZih', category: 'Generation 12' },
    { id: 47, name: 'Oline', url: 'https://discord.com/api/webhooks/1299728545832243294/2dSVtSAekuWnIu2xkkR8sibtQV9new7x-cPgTa79YAq20BebO3zDBAMugF3eQ2gga9sb', category: 'Generation 12' },
    { id: 48, name: 'Reggie', url: 'https://discord.com/api/webhooks/1298894153710702623/XZREV-5yW7AXSctcVSJEjLxWSNNvfO9gJepPOvJmC92rUqbDPKd_gXrCnCQcYv8JA8cF', category: 'Generation 12' },
    { id: 49, name: 'Ribka', url: 'https://discord.com/api/webhooks/1298528906474946631/Nj5nLuBGxYJVgSZYt7B78hld0NMVZwpv4T__2LsA1ZygMoyxYsmsLMqXRabvL3WUDi37', category: 'Generation 12' },
    { id: 50, name: 'Trisha', url: 'https://discord.com/api/webhooks/1298527442448945234/9uOXWjrJfLs-CZ7VWWnublbKaS_zjCFQXHLbLlRyOnLZkvzO5-3WHeMzUNi2nP7vQ0zZ', category: 'Generation 12' },

    { id: 51, name: 'Gen', url: 'https', category: 'Generation 13' },
  ];

  const delayOptions = [5, 8, 10, 15]; // Opsi delay dalam detik

  const webhookDropdownRef = useRef(null);
  const delayDropdownRef = useRef(null);

  const handleWebhookSelect = (webhook) => {
    setSelectedWebhook(webhook.name);
    setIsWebhookDropdownOpen(false);
    onWebhookSelect(webhook.url, webhook.name);
  };

  const handleDelaySelect = (delay) => {
    setIsDelayDropdownOpen(false);
    onDelayChange(delay);
  };

  // Fungsi untuk menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        webhookDropdownRef.current &&
        !webhookDropdownRef.current.contains(event.target)
      ) {
        setIsWebhookDropdownOpen(false);
      }
      if (
        delayDropdownRef.current &&
        !delayDropdownRef.current.contains(event.target)
      ) {
        setIsDelayDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tambahkan fungsi untuk filter webhook
  const filteredWebhooks = webhooks.filter(webhook => 
    webhook.name.toLowerCase().startsWith(searchQuery.toLowerCase())
  );

  // Kelompokkan webhook yang sudah difilter
  const groupedFilteredWebhooks = filteredWebhooks.reduce((acc, webhook) => {
    if (!acc[webhook.category]) {
      acc[webhook.category] = [];
    }
    acc[webhook.category].push(webhook);
    return acc;
  }, {});

  return (
<nav className="fixed top-0 left-0 w-full bg-white border-b border-[#E5E7EB] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <div className="flex items-center">
            <span className="text-2xl font-bold text-[#111827]">
              Seraya Store
            </span>
          </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              disabled={selectedWebhook === 'Select Webhook'}
              className={`bg-[#6366F1] text-white px-4 py-2 rounded-md font-medium ${
                selectedWebhook === 'Select Webhook'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#4F46E5]'
              }`}
            >
              New Chat
            </button>

            {/* Dropdown Delay Selector */}
            <div className="relative" ref={delayDropdownRef}>
              <button
                onClick={() => setIsDelayDropdownOpen(!isDelayDropdownOpen)}
                className="flex items-center space-x-2 text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-6 py-2.5 rounded-md font-medium min-w-[140px] justify-between"
              >
                <span>Delay: {currentDelay}s</span>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDelayDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[140px] bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  {delayOptions.map((delay) => (
                    <button
                      key={delay}
                      onClick={() => handleDelaySelect(delay)}
                      className={`block w-full text-left px-6 py-3 text-sm hover:bg-[#F3F4F6] transition-colors duration-150 ${
                        delay === currentDelay 
                          ? 'text-[#6366F1] font-semibold bg-[#F3F4F6]' 
                          : 'text-[#4B5563]'
                      }`}
                    >
                      {delay}s
                    </button>
                  ))}
                </div>
              )}
            </div>

{/* Dropdown Webhook Selector */}
<div className="relative" ref={webhookDropdownRef}>
              <button
                onClick={() => setIsWebhookDropdownOpen(!isWebhookDropdownOpen)}
                className="flex items-center space-x-2 text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-6 py-2.5 rounded-md font-medium min-w-[200px] justify-between"
              >
                <span className="truncate">{selectedWebhook}</span>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isWebhookDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  {/* Search Input */}
                  <div className="sticky top-0 p-2 bg-white border-b border-gray-200 z-10">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search webhook..."
                        className="w-full px-4 py-2 text-sm text-[#4B5563] bg-[#F3F4F6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] pl-9"
                      />
                      <svg 
                        className="absolute left-3 top-2.5 w-4 h-4 text-[#6B7280]" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="max-h-[420px] overflow-y-auto">
                    {Object.entries(groupedFilteredWebhooks).map(([category, webhooksInCategory]) => (
                      webhooksInCategory.length > 0 && (
                        <div key={category}>
                          <div className="sticky top-0 px-4 py-2 text-xs font-semibold text-[#6B7280] bg-[#F3F4F6] border-b border-[#E5E7EB]">
                            {category} ({webhooksInCategory.length})
                          </div>
                          {webhooksInCategory.map((webhook) => (
                            <button
                              key={webhook.id}
                              onClick={() => handleWebhookSelect(webhook)}
                              className="block w-full text-left px-6 py-3 text-sm text-[#4B5563] hover:bg-[#F3F4F6] transition-colors duration-150"
                            >
                              <span className="font-medium">{webhook.name.slice(0, searchQuery.length)}</span>
                              {webhook.name.slice(searchQuery.length)}
                            </button>
                          ))}
                        </div>
                      )
                    ))}
                    {filteredWebhooks.length === 0 && (
                      <div className="px-6 py-4 text-sm text-[#6B7280] text-center">
                        No webhooks found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;