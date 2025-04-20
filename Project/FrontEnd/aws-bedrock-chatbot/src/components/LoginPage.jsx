// import React, { useState } from 'react';
// import { FiArrowLeft } from 'react-icons/fi';
// import './LoginPage.css';

// const LoginPage = ({ onLogin }) => {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setIsLoading(true);
    
//     // Simulate API call
//     setTimeout(() => {
//       if (onLogin) {
//         onLogin({ name, email });
//       }
//       setIsLoading(false);
//     }, 1000);
//   };

//   return (
//     <div className="login-container">
//       {/* <div className="login-back-button">
//         <button className="back-button">
//           <FiArrowLeft /> Back to home
//         </button>
//       </div> */}
      
//       <div className="login-content">
//         <div className="logo-container">
//           <div className="logo">
//             {/* <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg"> */}
//               {/* <circle cx="25" cy="15" r="5" fill="#4F46E5" />
//               <circle cx="15" cy="30" r="5" fill="#8B5CF6" />
//               <circle cx="35" cy="30" r="5" fill="#6366F1" />
//               <line x1="25" y1="15" x2="15" y2="30" stroke="#A78BFA" strokeWidth="2" />
//               <line x1="25" y1="15" x2="35" y2="30" stroke="#818CF8" strokeWidth="2" />
//               <line x1="15" y1="30" x2="35" y2="30" stroke="#C4B5FD" strokeWidth="2" />
//             </svg> */}
//           </div>
//         </div>

//         <div className="login-form-container">
//           <h1>Welcome to the DevilNet </h1>
//           <p className="login-subtitle">Please enter your information to continue</p>

//           <form onSubmit={handleSubmit} className="login-form">
//             <div className="form-group">
//               <label htmlFor="name">Full Name</label>
//               <input 
//                 type="text" 
//                 id="name" 
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="Enter your name"
//                 required
//               />
//             </div>

//             <div className="form-group">
//               <label htmlFor="email">Email Address</label>
//               <input 
//                 type="email" 
//                 id="email" 
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 placeholder="Enter your email"
//                 required
//               />
//             </div>

//             <button 
//               type="submit" 
//               className="login-button" 
//               disabled={isLoading || !name || !email}
//             >
//               {isLoading ? 'Signing in...' : 'Sign In'}
//             </button>
//           </form>

//           <p className="desktop-note">Desktop Recommended</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleBackClick = () => {
    // For a real back button, we would go back to a previous route
    // In this case, we'll just clear the form
    setName('');
    setEmail('');
  };


  const handleSubmit = (e) => {
  e.preventDefault();
  setIsLoading(true);
  
  // Pass the user data (including name) to the onLogin callback
  setTimeout(() => {
    if (onLogin) {
      onLogin({ name, email });
    }
    setIsLoading(false);
  }, 1000);
};



  return (
    <div className="login-container">
      {/* <div className="login-back-button">
        <button className="back-button" onClick={handleBackClick}>
          <FiArrowLeft /> Back to home
        </button>
      </div> */}
      
      <div className="login-content">
        {/* <div className="logo-container">
          <div className="logo">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="15" r="5" fill="#4F46E5" />
              <circle cx="15" cy="30" r="5" fill="#8B5CF6" />
              <circle cx="35" cy="30" r="5" fill="#6366F1" />
              <line x1="25" y1="15" x2="15" y2="30" stroke="#A78BFA" strokeWidth="2" />
              <line x1="25" y1="15" x2="35" y2="30" stroke="#818CF8" strokeWidth="2" />
              <line x1="15" y1="30" x2="35" y2="30" stroke="#C4B5FD" strokeWidth="2" />
            </svg>
          </div>
        </div> */}

        <div className="login-form-container">
          <h1>Welcome to the DevilNet!</h1>
          <p className="login-subtitle">Please enter your information to continue</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <button 
              type="submit" 
              className="login-button" 
              disabled={isLoading || !name || !email}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="desktop-note">Desktop Recommended</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;