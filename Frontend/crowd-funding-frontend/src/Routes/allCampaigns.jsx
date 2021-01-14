import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import NavBar from "../Components/navbar_notLanding";
import Campaign from "../Components/everyOngoingCampaigns";
import Pagination from "../Components/pagination";
import { getAllCampaigns } from "../services/campaign";
import { paginate } from "../Components/utills/paginate";

const AllCampaigns = (props) => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    async function getData() {
      const { data, err } = await getAllCampaigns();
      if (err === undefined) {
        setData(data);
      } else {
        console.log(err);
        toast.error("Something went wrong");
      }
    }
    getData();
    return null;
  }, []);
  const handleClick = (p) => {
    let url = "/campaign/" + p;
    props.history.push(url);
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const pageSize = 6;
  const allCampaigns = paginate(data, currentPage, pageSize);
  return (
    <React.Fragment>
      <NavBar />
      <h1 style={{ textAlign: "center" }}>All Campaigns</h1>
      <hr />
      <div className="row">
        {allCampaigns.map((d) => (
          <div key={d._id} className={`col-sm-6 col-11 }`}>
            <Campaign
              id={d._id}
              handleClick={handleClick}
              title={d.title}
              description={d.description}
              image={d.imageUrl}
              requiredAmount={d.required}
              isActivated={d.isActivated}
            />
          </div>
        ))}
      </div>
      <Pagination
        itemsCount={data.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </React.Fragment>
  );
};

export default AllCampaigns;
